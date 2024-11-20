// src/Upload.js
import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';

const Upload = () => {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('author', author);
    formData.append('title', title);
    formData.append('mp4File', videoFile);

    try {
      const response = await fetch('http://130.245.136.220/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.status === 'OK') {
        alert('Video uploaded successfully!');
      } else {
        alert('Error uploading video: ' + data.message);
      }
    } catch (error) {
      alert('An error occurred while uploading the video');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Upload Video
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TextField
          label="Author"
          variant="outlined"
          fullWidth
          margin="normal"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
        <TextField
          label="Video Title"
          variant="outlined"
          fullWidth
          margin="normal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Button variant="outlined" component="label" fullWidth sx={{ mt: 2 }}>
          Choose Video File
          <input
            type="file"
            accept="video/mp4"
            hidden
            onChange={handleFileChange}
            required
          />
        </Button>
        {videoPreviewUrl && (
          <Box sx={{ mt: 3 }}>
            <video
              id="video-preview"
              src={videoPreviewUrl}
              controls
              width="100%"
              style={{ display: 'block', marginTop: '10px' }}
            />
          </Box>
        )}
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
          Upload Video
        </Button>
      </Box>
    </Container>
  );
};

export default Upload;
