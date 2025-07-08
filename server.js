require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require("./routes/tripRoutes");
const deepseekRoutes = require("./routes/deepseekRoutes");

const app = express();

// ✅ Middleware
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ✅ Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api/admin", adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/deepseek-chat", deepseekRoutes);

// ✅ MongoDB + Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(4000, () => {
    console.log('✅ Server running on http://localhost:4000');
  }))
  .catch(err => console.log(err));
