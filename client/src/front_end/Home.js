import React, { useEffect, useState } from 'react'; 
import { Grid, Card, CardMedia, Typography, CardContent, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const VideoGallery = () => {
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate(); // Initialize useNavigate hook

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/check-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();

        if (!data.isLoggedIn) { navigate('/login'); }  // If the user is not logged in, redirect to the login page
        else { loadVideos(10); }

      } catch (error) {
        console.error('Failed to check auth:', error);
        navigate('/login'); // Redirect if there's an error with the auth check
      }
    };

    checkAuth(); // Run the auth check when the component is mounted
  }, [navigate]);

  // Load videos
  const loadVideos = async (count) => {
    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const data = await response.json();
      if (data.status === 'OK') { setVideos(data.videos); } 
      else { console.error('Error fetching videos:', data); }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  return (
    <Container sx={{ marginTop: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Video Gallery
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        {videos.map((video) => (
          <Grid item key={video.id} xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => window.location.href = `/play/${video.id}`}>
              <CardMedia
                component="img"
                image={`/api/thumbnail/${video.id}`}
                alt={`${video.title} Thumbnail`}
                sx={{ height: 120 }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {video.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {video.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default VideoGallery;
