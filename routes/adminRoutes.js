const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Admin Signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) return res.status(400).json({ msg: 'Admin already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newAdmin = new User({ name, email, password: hashedPassword, isAdmin: true });
  await newAdmin.save();

  res.json({ msg: 'Admin account created successfully' });
});

// Admin Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const admin = await User.findOne({ email });
  if (!admin || !admin.isAdmin) return res.status(400).json({ msg: 'Admin not found' });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(400).json({ msg: 'Incorrect password' });

  const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1d' });

  res.json({
    token,
    user: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      isAdmin: admin.isAdmin,
    },
  });
});

module.exports = router;
