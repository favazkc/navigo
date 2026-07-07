const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Invite = require('../models/Invite');
const Task = require('../models/Task');
const { sendInviteEmail } = require('../services/email.service');

// GET /api/v1/projects/:id/members
router.get(
  '/',
  authMiddleware,
  requireRole('Member'),
  asyncHandler(async (req, res) => {
    await req.project.populate('members.user', 'name email');
    // Strip dangling references where the user document no longer exists
    const validMembers = req.project.members.filter((m) => m.user != null);
    res.json({ success: true, data: validMembers });
  })
);

// POST /api/v1/projects/:id/members/invite — Admin only
router.post(
  '/invite',
  authMiddleware,
  requireRole('Admin'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role')
      .optional()
      .isIn(['Admin', 'Member'])
      .withMessage('Role must be Admin or Member'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, role = 'Member' } = req.body;

    // Check if already a member
    await req.project.populate('members.user', 'email');
    const alreadyMember = req.project.members.some((m) => m.user.email === email);
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a project member' });
    }

    // Cancel any existing pending invite for same email + project
    await Invite.deleteMany({
      project: req.project._id,
      invitedEmail: email,
      status: 'Pending',
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await Invite.create({
      project: req.project._id,
      invitedEmail: email,
      invitedBy: req.user.id,
      role,
      token,
      expiresAt,
    });

    const inviter = await User.findById(req.user.id);
    let emailWarning;
    try {
      await sendInviteEmail(email, req.project.name, inviter.name || inviter.email, token);
    } catch (emailErr) {
      emailWarning = 'Invite created but email delivery failed. Please share the invite link manually.';
    }

    res.status(201).json({
      success: true,
      message: emailWarning ?? `Invite sent to ${email}`,
      ...(emailWarning && { warning: emailWarning }),
    });
  })
);

// PUT /api/v1/projects/:id/members/:userId/role — Admin only
router.put(
  '/:userId/role',
  authMiddleware,
  requireRole('Admin'),
  [body('role').isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member')],
  validate,
  asyncHandler(async (req, res) => {
    const member = req.project.members.find((m) => m.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    member.role = req.body.role;
    await req.project.save();
    res.json({ success: true, data: req.project.members });
  })
);

// DELETE /api/v1/projects/:id/members/:userId — Admin only
router.delete(
  '/:userId',
  authMiddleware,
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    // Prevent removing the owner
    if (req.project.owner.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner' });
    }
    req.project.members = req.project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await Promise.all([
      req.project.save(),
      Task.updateMany(
        { project: req.project._id, assignee: req.params.userId, status: { $ne: 'Done' } },
        { $set: { assignee: null } }
      ),
    ]);
    res.json({ success: true, message: 'Member removed' });
  })
);

module.exports = router;
