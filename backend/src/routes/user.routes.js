const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// GET /api/v1/users/me
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  })
);

// PUT /api/v1/users/me
router.put(
  '/me',
  authMiddleware,
  [body('name').trim().notEmpty().withMessage('Name is required')],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: req.body.name },
      { new: true, runValidators: true }
    ).select('-__v');
    res.json({ success: true, data: user });
  })
);

module.exports = router;
