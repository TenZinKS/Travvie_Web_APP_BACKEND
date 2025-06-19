const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require('./routes/userRoutes'); 

require('dotenv').config();
const app = express();

// ✅ Middleware should come first
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ✅ Then mount routes

app.use("/api/admin", adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // ✅ Register here after middleware

// ✅ Start server after successful DB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(4000, () => console.log('✅ Server running on http://localhost:4000')))
  .catch(err => console.log(err));
