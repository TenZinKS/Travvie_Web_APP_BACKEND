// routes/uploadRoute.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// POST /api/upload
router.post('/', upload.single('profile'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    // 400: missing either userId or file
    if (!userId || !file) {
      return res.status(400).json({ msg: 'Missing userId or image' });
    }

    // 404: no such user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // all good: save and respond
    const imagePath = `/uploads/${file.filename}`;
    user.profilePic = imagePath;
    await user.save();

    return res.status(200).json({
      msg: 'Image uploaded',
      imageUrl: imagePath,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
