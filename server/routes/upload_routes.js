// routes/uploadRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Video = require('../models/Video');
const User = require('../models/User');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router();

// Set FFmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(__dirname, '..', 'videos'));  // Ensure path resolves correctly
    },
    filename: function (req, file, cb) {
        // Create a unique filename using the UUID
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

// Define file type limits for safety
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4'];  // Add any other types you want to support
        if (!allowedTypes.includes(file.mimetype)) { return cb(new Error('Invalid file type, only MP4')); }
        cb(null, true);
    }
}).single('mp4File');

router.use(express.json());

// Route to handle video upload
router.post('/upload', upload, async (req, res) => {
    const { author, title } = req.body;
    const userId = req.session.userId;

    if (!req.file || !author || !title) {
        return res.status(200).json({ status: 'ERROR', error: true, message: 'Missing required fields (author, title, or video file)' });
    }

    try {
        // Create the video document in the database with a 'processing' status
        const count = await Video.countDocuments();
        const video = new Video({
            title: title,
            description: author,
            status: 'processing',  // Default status
            index: count
        });
        
        // Save video document to database
	    res.status(200).send({ status: 'OK', id: video._id });
        await video.save();
        

        // Background operations for renaming and processing video
        const newFileName = `${video._id}${path.extname(req.file.originalname)}`;
        const oldFilePath = path.join(__dirname, '..', 'videos', req.file.filename);
        const newFilePath = path.join(__dirname, '..', 'videos', newFileName);

        fs.rename(oldFilePath, newFilePath, (err) => {
            if (err) {
                console.error('Error renaming file:', err);
                return;
            }
            // Start background processing after renaming
            backgroundProcessVideo(newFilePath, video._id, res);
        });

        // Update user document with the video ID
        await User.findByIdAndUpdate(userId, { $push: { videos: video._id } });

    } catch (error) {
        console.error(error);
        res.status(200).json({ status: 'ERROR', error: true, message: error.message });
    }
});


// Background function to handle video processing and status update
async function backgroundProcessVideo(filePath, videoId, res) {
  try {
      // Process video and generate thumbnail in parallel
      await Promise.all([
          processVideo(filePath, videoId),
          generateThumbnail(filePath, videoId),
      ]);

      // Update video status to 'complete' after processing finishes
      await Video.findByIdAndUpdate(videoId, { status: 'complete' });
      console.log(`Video ${videoId} processed and status updated to complete`);
  } catch (error) {
      res.status(200).json({ status: 'ERROR', error:true, message: error.message });
  }
}

// Function to process video into multiple resolutions using FFmpeg
async function processVideo(inputPath, videoId) {
  return new Promise((resolve, reject) => {
      const outputDir = path.resolve(__dirname, '..', 'media');
      const outputPath = path.join(outputDir, `${videoId}.mpd`);

      // Set up the FFmpeg command to generate the DASH (adaptive bitrate) streams
      ffmpeg(inputPath).videoFilters([
          {
              filter: 'scale',
              options: {
                  w: 'if(gt(iw/ih,16/9),min(1280,iw),-2)',
                  h: 'if(gt(iw/ih,16/9),-2,min(720,ih))'
              }
          },
          {
              filter: 'pad',
              options: {
                  w: '1280',
                  h: '720',
                  x: '(1280-iw*min(1280/iw\,720/ih))/2',
                  y: '(720-ih*min(1280/iw\,720/ih))/2',
                  color: 'black'
              }
          }
      ]).outputOptions([
          '-map', '0:v', '-b:v:0', '254k', '-s:v:0', '320x180',
          '-map', '0:v', '-b:v:1', '507k', '-s:v:1', '320x180',
          '-map', '0:v', '-b:v:2', '759k', '-s:v:2', '480x270',
          '-map', '0:v', '-b:v:3', '1013k', '-s:v:3', '640x360',
          '-map', '0:v', '-b:v:4', '1254k', '-s:v:4', '640x360',
          '-map', '0:v', '-b:v:5', '1883k', '-s:v:5', '768x432',
          '-map', '0:v', '-b:v:6', '3134k', '-s:v:6', '1024x576',
          '-map', '0:v', '-b:v:7', '4952k', '-s:v:7', '1280x720',
          '-f', 'dash',
          '-seg_duration', '10',
          '-use_template', '1',
          '-use_timeline', '1',
          '-adaptation_sets', 'id=0,streams=v',
          '-init_seg_name', `${videoId}_init_$RepresentationID$.m4s`,
          '-media_seg_name', `${videoId}_chunk_$Bandwidth$_$Number$.m4s`
      ]).on('end', () => {
          console.log('Video processing complete');
          resolve();
      }).on('error', (err) => {
          console.error('Error processing video:', err);
          reject(err);
      })
      .save(outputPath);
  });
}

async function generateThumbnail(inputPath, videoId) {
    return new Promise((resolve, reject) => {
        const thumbnailDir = path.resolve(__dirname, '..', 'thumbnails');
        const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);

        const THUMBNAIL_WIDTH = 320;
        const THUMBNAIL_HEIGHT = 180;

        ffmpeg(inputPath)
            .on('end', () => {
                console.log(`Thumbnail generated at ${thumbnailPath}`);
                resolve(thumbnailPath);
            })
            .on('error', (err) => {
                console.error('Error generating thumbnail:', err);
                reject(err);
            })
            .output(thumbnailPath)
            .outputOptions([
                `-vf`,
                `scale='if(gt(iw/ih,${THUMBNAIL_WIDTH}/${THUMBNAIL_HEIGHT}),${THUMBNAIL_WIDTH},-1)':'if(gt(iw/ih,${THUMBNAIL_WIDTH}/${THUMBNAIL_HEIGHT}),-1,${THUMBNAIL_HEIGHT})',` +
                `pad=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:(ow-iw)/2:(oh-ih)/2`
            ])
            .frames(1)
            .run();
    });
}

module.exports = router;