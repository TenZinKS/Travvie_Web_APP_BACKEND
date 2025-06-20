const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ✅ User Registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

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
    if (!isMatch) return res.status(400).json({ msg: 'Incorrect password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic || "",
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error during login' });
  }
});


// ✅ Update profile: name and/or profile picture (with auto-delete of old pic)
router.put('/:id', upload.single('profilePic'), async (req, res) => {
  const { name } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // If new profilePic uploaded and old one exists → delete old file
    if (req.file && user.profilePic) {
      const oldFile = path.join(__dirname, '..', 'uploads', path.basename(user.profilePic));

      // Try to delete the old image file
      try {
        require('fs').unlinkSync(oldFile);
      } catch (err) {
        console.warn("⚠️ Failed to delete old profile image (possibly missing):", err.message);
      }

      user.profilePic = `http://localhost:4000/uploads/${req.file.filename}`;
    }

    // Always update name if provided
    if (name) user.name = name;

    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || "",
      isAdmin: user.isAdmin,
    });
  } catch (err) {
    console.error("Profile update error:", err.message);
    return res.status(500).json({ msg: 'Error updating profile' });
  }
});



module.exports = router;
