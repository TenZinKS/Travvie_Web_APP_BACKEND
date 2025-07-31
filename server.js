require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require("./routes/tripRoutes");
const uploadRoute = require('./routes/uploadRoute');
const deepseekRoutes = require("./routes/deepseekRoutes");

const app = express();

// ✅ CORS
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
app.use('/api/upload', uploadRoute);
app.use("/api/deepseek-chat", deepseekRoutes);

// ✅ Only connect in non-test environments
if (process.env.NODE_ENV !== "test") {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      app.listen(4000, '0.0.0.0', () => {
        console.log('✅ Server running on http://0.0.0.0:4000');

        // 🔥 Keepalive interval (every 5 minutes)
        setInterval(() => {
          fetch('http://127.0.0.1:4000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: "test@gmail.com",
              password: "tenzin"
            }),
          })
            .then(res => res.json())
            .then(data => {
              console.log("[Keepalive] Successful login:", data);
            })
            .catch(err => {
              console.error("[Keepalive] Failed to ping:", err.message);
            });
        }, 5 * 60 * 1000);
      });
    })
    .catch(err => console.log(err));
}

module.exports = app;
