const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post('/', upload.single('profile'), async (req, res) => {
  try {
    const userId = req.body.userId;
    const imagePath = `/uploads/${req.file.filename}`;

    if (!userId || !req.file) {
      return res.status(400).json({ msg: 'Missing userId or image' });
    }

    const user = await User.findByIdAndUpdate(userId, { profile: imagePath }, { new: true });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({ msg: 'Image uploaded', imageUrl: imagePath });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
