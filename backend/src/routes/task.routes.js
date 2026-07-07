const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');

// GET /api/v1/projects/:id/tasks
router.get(
  '/',
  authMiddleware,
  requireRole('Member'),
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ status: 1, order: 1 })
      .lean();
    res.json({ success: true, data: tasks });
  })
);

// POST /api/v1/projects/:id/tasks
router.post(
  '/',
  authMiddleware,
  requireRole('Member'),
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('status')
      .optional()
      .isIn(['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['Low', 'Medium', 'High'])
      .withMessage('Invalid priority'),
    body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // Calculate next order within the status column
    const lastTask = await Task.findOne({
      project: req.params.id,
      status: req.body.status || 'Backlog',
    }).sort({ order: -1 });

    const task = await Task.create({
      project: req.params.id,
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status || 'Backlog',
      priority: req.body.priority || 'Medium',
      dueDate: req.body.dueDate || null,
      assignee: req.body.assignee || null,
      createdBy: req.user.id,
      order: lastTask ? lastTask.order + 1 : 0,
    });

    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    res.status(201).json({ success: true, data: task });
  })
);

// GET /api/v1/projects/:id/tasks/:taskId
router.get(
  '/:taskId',
  authMiddleware,
  requireRole('Member'),
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  })
);

// PUT /api/v1/projects/:id/tasks/:taskId
router.put(
  '/:taskId',
  authMiddleware,
  requireRole('Member'),
  [
    body('title').optional().trim().notEmpty(),
    body('status').optional().isIn(['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done']),
    body('priority').optional().isIn(['Low', 'Medium', 'High']),
    body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
    body('order').optional().isNumeric(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const allowed = ['title', 'description', 'status', 'priority', 'dueDate', 'order'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });
    // assignee must be set via $set to correctly handle null (clearing the field)
    if (req.body.assignee !== undefined) {
      task.assignee = req.body.assignee || null;
    }

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    res.json({ success: true, data: task });
  })
);

// DELETE /api/v1/projects/:id/tasks/:taskId — Admin only
router.delete(
  '/:taskId',
  authMiddleware,
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  })
);

// PATCH /api/v1/projects/:id/tasks/reorder
// Body: { updates: [{ id, order, status }] }
router.patch(
  '/reorder',
  authMiddleware,
  requireRole('Member'),
  asyncHandler(async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'updates array required' });
    }

    const now = new Date();
    const bulkOps = updates.map(({ id, order, status }) => ({
      updateOne: {
        filter: { _id: id, project: req.params.id },
        update: { $set: { order, updatedAt: now, ...(status ? { status } : {}) } },
      },
    }));

    await Task.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Tasks reordered' });
  })
);

module.exports = router;
