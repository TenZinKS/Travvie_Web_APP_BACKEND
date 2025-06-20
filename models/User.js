const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  profilePic: { type: String }, 
});

module.exports = mongoose.model("User", userSchema);
