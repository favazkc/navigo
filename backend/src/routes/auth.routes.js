const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const { getCognitoLoginUrl, exchangeCodeForTokens, issueAppToken } = require('../services/cognito.service');
const User = require('../models/User');

// ── POST /api/v1/auth/register — email + password registration ────────────────
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });

    // Allow invited stub users (password=null, no cognitoSub) to complete their registration
    if (existing) {
      if (existing.password || existing.cognitoSub) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      // Stub account from invite — set name + password to complete the profile
      // systemRole stays 'user' (invited members are never admins at the system level)
      existing.name = name;
      existing.password = password;
      await existing.save();
      const token = issueAppToken(existing);
      return res.status(201).json({
        success: true,
        data: { token, user: { id: existing._id, email: existing.email, name: existing.name, systemRole: existing.systemRole } },
      });
    }

    const user = await User.create({ name, email, password });
    const token = issueAppToken(user);
    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, email: user.email, name: user.name, systemRole: user.systemRole } },
    });
  })
);

// ── POST /api/v1/auth/login — email + password login ─────────────────────────
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = issueAppToken(user);
    res.json({
      success: true,
      data: { token, user: { id: user._id, email: user.email, name: user.name, systemRole: user.systemRole } },
    });
  })
);

// GET /api/v1/auth/login — redirect to Cognito Hosted UI
router.get('/login', (req, res) => {
  const loginUrl = getCognitoLoginUrl();
  res.json({ success: true, data: { loginUrl } });
});

// GET /api/v1/auth/callback — exchange code, upsert user, issue JWT
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code missing' });
    }

    let cognitoUser;
    try {
      cognitoUser = await exchangeCodeForTokens(code);
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      return res.status(401).json({ success: false, message: `Cognito authentication failed: ${detail}` });
    }

    // Upsert user by cognitoSub
    let user = await User.findOne({ cognitoSub: cognitoUser.sub });
    if (!user) {
      user = await User.findOne({ email: cognitoUser.email });
      if (user) {
        user.cognitoSub = cognitoUser.sub;
        user.name = user.name || cognitoUser.name || '';
      } else {
        user = new User({
          cognitoSub: cognitoUser.sub,
          email: cognitoUser.email,
          name: cognitoUser.name || '',
        });
      }
      await user.save();
    }

    const token = issueAppToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, email: user.email, name: user.name, systemRole: user.systemRole || 'user' },
      },
    });
  })
);

// POST /api/v1/auth/logout — client-side token removal (stateless)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
