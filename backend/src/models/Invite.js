const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    invitedEmail: { type: String, required: true, lowercase: true, trim: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: { type: String, enum: ['Admin', 'Member'], default: 'Member' },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Expired'],
      default: 'Pending',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invite', inviteSchema);
