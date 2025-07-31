// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Admin Signup
router.post('/signup', async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // 1️⃣ All three fields are required
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Name, email, and password are required' });
    }

    // 2️⃣ Normalize email to lowercase
    email = email.toLowerCase().trim();

    // 3️⃣ Check uniqueness
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ msg: 'Admin already exists' });
    }

    // 4️⃣ Hash password & create
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({
      name: name.trim(),
      email,
      password: hashedPassword,
      isAdmin: true,
    });
    await newAdmin.save();

    return res.status(200).json({ msg: 'Admin account created successfully' });
  } catch (err) {
    console.error('Admin signup error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    // 1️⃣ Missing credentials → “not found”
    if (!email || !password) {
      return res.status(400).json({ msg: 'Admin not found' });
    }

    // 2️⃣ Normalize email
    email = email.toLowerCase().trim();

    // 3️⃣ Lookup & verify admin status
    const admin = await User.findOne({ email });
    if (!admin || !admin.isAdmin) {
      return res.status(400).json({ msg: 'Admin not found' });
    }

    // 4️⃣ Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password' });
    }

    // 5️⃣ Issue JWT
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        isAdmin: admin.isAdmin,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
