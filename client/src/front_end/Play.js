import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import dashjs from 'dashjs';

const VideoShorts = () => {
  const [currentVideoId, setCurrentVideoId] = useState(window.location.pathname.split('/').pop() || 'defaultId');
  const [historyIndex, setHistoryIndex] = useState(0);
  const [watchHistory, setWatchHistory] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const navigate = useNavigate();

  const playPauseHandler = () => {
    if (currentPlayer) {
      if (currentPlayer.isPaused()) {
        currentPlayer.play();
        document.getElementById('playPauseBtn').textContent = 'Pause';
      } else {
        currentPlayer.pause();
        document.getElementById('playPauseBtn').textContent = 'Play';
      }
    }
  };

  const createVideoPlayer = (videoId) => {
    const videoItem = document.createElement('div');
    videoItem.classList.add('videoItem');
    videoItem.id = `videoPlayer_${videoId}`;

    const videoElement = document.createElement('video');
    videoElement.setAttribute('controls', true);
    videoElement.style.width = '70%';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttonsContainer');

    const likeBtn = document.createElement('button');
    likeBtn.textContent = 'Like';
    likeBtn.setAttribute('name', 'like');
    likeBtn.addEventListener('click', () => {
      fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: videoId, value: true })
      }).catch(error => console.error(`Error updating like on video ${videoId}: ${error}`));
    });

    const dislikeBtn = document.createElement('button');
    dislikeBtn.textContent = 'Dislike';
    dislikeBtn.setAttribute('name', 'dislike');
    dislikeBtn.addEventListener('click', () => {
      fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: videoId, value: false })
      }).catch(error => console.error(`Error updating dislike on video ${videoId}: ${error}`));
    });

    buttonsContainer.appendChild(likeBtn);
    buttonsContainer.appendChild(dislikeBtn);

    videoItem.appendChild(videoElement);
    videoItem.appendChild(buttonsContainer);
    document.getElementById('videoList').appendChild(videoItem);

    const mediaUrl = `/media/${videoId}.mpd`;
    const player = dashjs.MediaPlayer().create();
    player.initialize(videoElement, mediaUrl, false);

    setWatchHistory(prevHistory => [...prevHistory, { videoId, player, videoElement }]);
  };

  useEffect(() => {
    const loadInitialVideo = () => {
      createVideoPlayer(currentVideoId);
      setCurrentPlayer(watchHistory[0]?.player);
    };

    loadInitialVideo();
    document.getElementById('playPauseBtn').onclick = playPauseHandler;

    // Scroll event handling
    window.addEventListener('wheel', (event) => {
      if (event.deltaY > 0 && historyIndex < watchHistory.length - 1) {
        setHistoryIndex(historyIndex + 1);
      } else if (event.deltaY < 0 && historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
      }
      if (historyIndex >= watchHistory.length - 3) {
        preloadVideos(10);
      }
    });
  }, [historyIndex, currentVideoId, watchHistory]);

  const preloadVideos = async (count) => {
    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      const data = await response.json();
      if (data?.videos) {
        data.videos.forEach(vid => createVideoPlayer(vid.id));
      }
    } catch (error) {
      console.error('Error preloading videos:', error);
    }
  };

  return (
    <Container>
      <Box display="flex" flexDirection="column" alignItems="center" sx={{ position: 'relative', height: '100vh' }}>
        <Button
          id="playPauseBtn"
          variant="contained"
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '15px 30px',
            borderRadius: '50px',
            backgroundColor: '#007bff',
            '&:hover': { backgroundColor: '#0056b3' },
          }}
        >
          Play/Pause
        </Button>

        <Box id="videoList" sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Video content will be dynamically added here */}
        </Box>
      </Box>
    </Container>
  );
};

export default VideoShorts;
