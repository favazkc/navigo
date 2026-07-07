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

    const isAdmin = req.membership.role === 'Admin';

    // Creator has same assignee privileges as admin — no restriction needed on create
    // (non-creator members hitting this endpoint are always creators of the new task)

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

    const isAdmin = req.membership.role === 'Admin';
    const isCreator = task.createdBy.toString() === req.user.id;
    const currentAssignee = task.assignee ? task.assignee.toString() : null;
    const isAssignedToMe = currentAssignee === req.user.id;
    const isUnassigned = currentAssignee === null;

    if (!isAdmin) {
      // Must be the creator, the current assignee, or the task must be unassigned
      const canEdit = isCreator || isAssignedToMe || isUnassigned;
      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'Access denied: you can only edit tasks you created or are assigned to' });
      }

      // Non-admin, non-creator members cannot assign a task to someone other than themselves (or null)
      if (!isCreator && req.body.assignee !== undefined) {
        const newAssignee = req.body.assignee || null;
        if (newAssignee !== null && newAssignee !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied: you cannot assign tasks to other members' });
        }
      }
    }

    // Apply updates — scope depends on role/ownership:
    //   Admin or creator  → all fields
    //   Assignee/unassigned (non-creator) → status, description, assignee only
    const allowed = isAdmin || isCreator
      ? ['title', 'description', 'status', 'priority', 'dueDate', 'order']
      : ['status', 'description'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });
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

    const isAdmin = req.membership.role === 'Admin';

    if (!isAdmin) {
      // Only the dragged task (the one whose status changes) needs an ownership check.
      // Bystander tasks in the destination column are just getting their order index bumped — no ownership required.
      const draggedIds = updates.filter((u) => u.status).map((u) => u.id);
      if (draggedIds.length > 0) {
        const draggedTasks = await Task.find({ _id: { $in: draggedIds }, project: req.params.id }).lean();
        const forbidden = draggedTasks.find((t) => {
          const isCreator = t.createdBy.toString() === req.user.id;
          const assignee = t.assignee ? t.assignee.toString() : null;
          return !isCreator && assignee !== req.user.id && assignee !== null;
        });
        if (forbidden) {
          return res.status(403).json({ success: false, message: 'Access denied: you can only move tasks you created or are assigned to' });
        }
      }
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
