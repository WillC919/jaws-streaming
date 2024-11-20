// routes/videoRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const Video = require('../models/Video');
const User = require('../models/User');
const { makeRecommendations } = require('../recommendations');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/milestone-1', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

router.post('/videos', async (req, res) => {
  const { count} = req.body;
  const userId = req.session.userId;
  const recommendedVideos = await makeRecommendations(userId, count);

  try {
    const videos = [];
    for (let i = 0; i < recommendedVideos.length; i++) {
      let video = await Video.findById(recommendedVideos[i].itemId);
      let user = await User.findById(userId);
     
      let videoData = {
        id: video._id,
        description: video.description,
        title: video.title,
        watched: user.watched.includes(video._id),
        liked: user.liked.includes(video._id),
        likevalues: video.like
      }
      videos.push(videoData);
    }
    return res.json({ status: 'OK', videos: videos });
  } catch (err) {
    return res.status(200).json({ status: 'ERROR', error: true, message: err.message });
  }
});

// GET /manifest/:id - Send DASH manifest for video with id :id
router.get('/manifest/:id', async (req, res) => {
    const videoId = req.params.id;
    try {
      const manifestPath = path.join(__dirname, '../media', `${videoId}.mpd`);
      res.sendFile(manifestPath, err => {
        if (err) { res.status(200).json({ status: 'ERROR', error: true, message: err.message });}
      });
    } catch (err) {
      res.status(200).json({ status: 'ERROR', error: true, message: err.message });
    }
});

router.get('/getVideo/:id', async (req, res) => {
    console.log("hello");
    const videoId = req.params.id;
    const userId = req.session.userId;
    try {
      const video = await Video.findById(videoId);
      const user = await User.findById(userId);
      return res.status(200).json({
        id: video.id,
        description: video.description,
        title: video.title,
        watched: user.watched.includes(video.id),
        liked: user.liked.includes(video.id),
        likevalues: video.like,
      });
    } catch (err) {
      res.status(200).json({status: 'ERROR', error: true, message: err.message});
    }
});

// GET /thumbnail/:id - Send thumbnail for video with id :id
router.get('/thumbnail/:id', async (req, res) => {
    const videoId = req.params.id;
    try {
      const thumbnailPath = path.join(__dirname, '../thumbnails', `${videoId}.jpg`); // Adjust based on your video naming convention
      res.sendFile(thumbnailPath, err => {
        if (err) { res.status(200).json({ status: 'ERROR', error: true, message: err.message }); }
      });
    } catch (err) {
      res.status(200).json({ status: 'ERROR', error: true, message: 'An error occurred' })
    }
});

router.post('/view', async (req, res) => {
  const { id: videoId } = req.body;
  const userId = req.session.userId;
  const user = await User.findById(userId);
  const viewed = user.watched.includes(videoId);
  

  if (!viewed) {
    user.watched.push(videoId);
    await user.save();
  }

  return res.json({ status: 'OK', viewed: viewed, });
});

router.post('/like', async (req, res) => {
  const { id: videoId, value } = req.body;
  const userId = req.session.userId;

  try {
    const user = await User.findById(userId);
    const video = await Video.findById(videoId);

    const liked = user.liked.includes(videoId);
    const disliked = user.disliked.includes(videoId);

    // Prevent duplicate actions
    if ((value && liked) || (!value && disliked)) {
      return res.status(200).json({ status: 'ERROR', error: true, message: "The value that you want to set is the same" });
    }

    if (value) {
      if (disliked) {
        user.disliked.pull(videoId);
        video.dislike -= 1; // Ensure field names match schema
      }
      user.liked.push(videoId);
      video.like += 1; // Ensure field names match schema
    } else {
      if (liked) {
        user.liked.pull(videoId);
        video.like -= 1;
      }
      user.disliked.push(videoId);
      video.dislike += 1;
    }

    await user.save();
    await video.save();

    res.status(200).json({ status: 'OK', likes: video.like });
  } catch (error) {
    console.error(error);
    res.status(200).json({ status: 'ERROR', error: true, message: 'An error occurred while updating like status' });
  }
});

router.get('/processing-status', async (req, res) => {
  const userId = req.session.userId;
  try {
    const user = await User.findById(userId);
    const videoIds = user.videos;
    const videos = [];
    for (let i = 0; i < videoIds.length; i++) {
      const videoStats = await Video.findById(videoIds[i]);
      let video = {
        id: videoStats.id,
        title: videoStats.title,
        status: videoStats.status
      }
      videos.push(video);
    }
    return res.status(200).json({ status: 'OK', videos: videos })
  } catch (err) {
    res.status(200).json({ status: 'ERROR', error: true, message: err.message });
  }
});

module.exports = router;