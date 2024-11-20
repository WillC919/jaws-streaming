// routes/userRoutes.js
const express = require('express');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const router = express.Router();

// Mail configuration
const { smtpConfig } = require('../config/mail_config');
const transporter = nodemailer.createTransport(smtpConfig);

// Add user
router.post('/adduser', async (req, res) => {
  console.log('Request Body:', req.body);

  try {
    const { username, password, email } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(200).json({ status: 'ERROR', error:true, message: 'User already exists' });
    }

    // Create a new user
    const count = await User.countDocuments();
    const user = new User({ username, password, email, index: count});
    await user.save();

    // Send verification email
    const verificationKey = Buffer.from(email).toString('base64'); // Simple encoding for verification
    const verifyLink = `http://jaws.cse356.compas.cs.stonybrook.edu/api/verify?email=${encodeURIComponent(email)}&key=${verificationKey}`;

    // Attempt to send the email
    const mailOptions = {
      from: 'noreply@jaws.cse356.compas.cs.stonybrook.edu',
      to: email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking the link: ${verifyLink}`
    };

    // Sending email
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(200).json({ status: 'ERROR', error: true, message: 'Failed to send verification email.' });
      }
    });
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    res.status(200).json({ status: 'ERROR', error:true, message: error.message });
  }
});

// Verify user
router.get('/verify', async (req, res) => {
  const { email, key } = req.query;
  const decodedEmail = Buffer.from(key, 'base64').toString('utf-8');

  if (decodedEmail !== email) {
    return res.status(200).json({ status: 'ERROR', error:true, message: 'Invalid verification link' });
  }

  try {
    await User.updateOne({ email }, { verified: true });
    res.status(200).json({ status: 'OK', message: 'Email verified successfully' });
  } catch (error) {
    res.status(200).json({ status: 'ERROR', error:true, message: error.message });
  }
});

router.get('/session', async (req, res) => {
  if (req.session && req.session.userId) {
    const user = await User.findById(req.session.userId);

    if (!user) {
        return res.status(200).json({ status: 'ERROR', error:true, message: "not user" });
    }
    return res.status(200).json({ status: 'OK', username: user.username });
  } else {
    return res.status(200).json({ status: 'ERROR', error:true, message: 'No active session' });
  }
});

module.exports = router;