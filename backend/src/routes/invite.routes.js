const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const Invite = require('../models/Invite');
const User = require('../models/User');
const Project = require('../models/Project');

// GET /api/v1/invites/accept?token=<uuid>
router.get(
  '/accept',
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const invite = await Invite.findOne({ token }).populate('project');
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    if (invite.status === 'Accepted') {
      // Already accepted — return success so the UI shows the correct state
      const project = await Project.findById(invite.project._id);
      return res.json({
        success: true,
        message: 'Invite already accepted',
        data: { projectId: project._id, projectName: project.name },
      });
    }

    if (invite.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Invite is ${invite.status}` });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'Expired';
      await invite.save();
      return res.status(400).json({ success: false, message: 'Invite has expired' });
    }

    // Upsert invited user
    let user = await User.findOne({ email: invite.invitedEmail });
    if (!user) {
      user = await User.create({ email: invite.invitedEmail, name: '' });
    }

    const project = await Project.findById(invite.project._id);
    const alreadyMember = project.members.some((m) => m.user.toString() === user._id.toString());
    if (!alreadyMember) {
      project.members.push({ user: user._id, role: invite.role });
      await project.save();
    }

    invite.status = 'Accepted';
    await invite.save();

    // isNewUser = true means the account was just stub-created and needs a password set via register
    const isNewUser = !user.password && !user.cognitoSub;

    res.json({
      success: true,
      message: 'Invite accepted',
      data: {
        projectId: project._id,
        projectName: project.name,
        isNewUser,
        email: user.email,
      },
    });
  })
);

module.exports = router;
