const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ✅ User Registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isAdmin: false,
    });

    await newUser.save();
    res.json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during registration' });
  }
});

// ✅ User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.isAdmin) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: 'Incorrect password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic || '',
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

// ✅ Update profile
router.put('/:id', upload.single('profilePic'), async (req, res) => {
  const { name } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (req.file && user.profilePic) {
      const oldFile = path.join(
        __dirname,
        '..',
        'uploads',
        path.basename(user.profilePic)
      );
      try {
        fs.unlinkSync(oldFile);
      } catch (err) {
        console.warn('⚠️ Failed to delete old profile image:', err.message);
      }
      user.profilePic = `http://localhost:4000/uploads/${req.file.filename}`;
    }

    if (name) user.name = name;

    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || '',
      isAdmin: user.isAdmin,
    });
  } catch (err) {
    console.error('Profile update error:', err.message);
    return res.status(500).json({ msg: 'Error updating profile' });
  }
});

// ✅ Forgot Password - send reset link
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Email not found.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Travvie" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Travvie - Reset Your Password',
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested to reset your password.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour.</p>
      `,
    });

    res.json({ msg: 'Reset link sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to send reset link.' });
  }
});

// ✅ Reset password
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ msg: 'Invalid or expired password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ msg: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to reset password.' });
  }
});

// ✅ Change Password
router.put('/change-password/:id', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Current password incorrect" });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    user.password = hashedNew;
    await user.save();

    res.json({ msg: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error changing password." });
  }
});

// ✅ Delete User
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    await user.deleteOne();

    res.json({ msg: 'User deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to delete user.' });
  }
});

module.exports = router;
