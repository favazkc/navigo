const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done'],
      default: 'Backlog',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    dueDate: { type: Date, default: null },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for fetching tasks by project efficiently
taskSchema.index({ project: 1, status: 1, order: 1 });

module.exports = mongoose.model('Task', taskSchema);
