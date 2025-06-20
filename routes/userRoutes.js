const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ Get all users (excluding passwords)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 }); // This still returns all other fields like isAdmin
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch users' });
  }
});

// ✅ Delete a user by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to delete user' });
  }
});

// ✅ Block or Unblock a user
router.put('/block/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ msg: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to update block status' });
  }
});

// ✅ Promote a user to admin
router.put('/promote/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.isAdmin) {
      return res.status(400).json({ msg: 'User is already an admin' });
    }

    user.isAdmin = true;
    await user.save();

    res.json({ msg: 'User promoted to admin successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to promote user' });
  }
});

// PATCH all users to add isAdmin and isBlocked fields if missing
router.patch('/patch-all', async (req, res) => {
  try {
    const users = await User.find({});
    const updates = await Promise.all(
      users.map(async (user) => {
        if (user.isAdmin === undefined || user.isBlocked === undefined) {
          user.isAdmin = user.isAdmin || false;
          user.isBlocked = user.isBlocked || false;
          return await user.save();
        }
        return user;
      })
    );
    res.json({ msg: "Users patched successfully", updated: updates.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to patch users" });
  }
});



module.exports = router;
