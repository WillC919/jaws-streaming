import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Link, Box } from '@mui/material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (data.status === 'OK') {
        window.location.href = '/'; // Redirect on successful login
      } else {
        setError(data.message); // Display error message
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Login
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
      <Typography sx={{ mt: 2 }}>
        Don't have an account?{' '}
        <Link href="/signup" underline="hover">
          Sign up here
        </Link>
      </Typography>
    </Container>
  );
};

export default Login;
