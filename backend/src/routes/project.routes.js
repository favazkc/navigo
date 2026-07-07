const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const Project = require('../models/Project');
const Task = require('../models/Task');

/**
 * Derive project status from its task counts:
 *   'To Do'       — no tasks exist
 *   'In Progress' — tasks exist but not all are Done
 *   'Done'        — all tasks are Done (and at least one exists)
 */
function deriveProjectStatus(totalTasks, doneTasks) {
  if (totalTasks === 0) return 'To Do';
  if (doneTasks === totalTasks) return 'Done';
  return 'In Progress';
}

// GET /api/v1/projects — list projects user belongs to
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ 'members.user': req.user.id })
      .populate('owner', 'name email')
      .select('-__v')
      .lean();

    // Count tasks per project in a single aggregation
    const projectIds = projects.map((p) => p._id);
    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
        },
      },
    ]);

    // Build a lookup map: projectId -> { total, done }
    const countMap = {};
    taskCounts.forEach(({ _id, total, done }) => {
      countMap[_id.toString()] = { total, done };
    });

    // Attach computed status to each project
    const enriched = projects.map((p) => {
      const { total = 0, done = 0 } = countMap[p._id.toString()] || {};
      return { ...p, status: deriveProjectStatus(total, done) };
    });

    res.json({ success: true, data: enriched });
  })
);

// POST /api/v1/projects — create new project
router.post(
  '/',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
    body('dueDate').optional({ nullable: true }).isISO8601().toDate().withMessage('Invalid due date'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // Only system admins can create projects
    if (req.user.systemRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can create projects' });
    }

    const project = await Project.create({
      name: req.body.name,
      description: req.body.description || '',
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'Admin' }],
      dueDate: req.body.dueDate || null,
    });
    await project.populate('owner', 'name email');
    res.status(201).json({ success: true, data: project });
  })
);

// GET /api/v1/projects/:id
router.get(
  '/:id',
  authMiddleware,
  requireRole('Member'),
  asyncHandler(async (req, res) => {
    await req.project.populate('members.user', 'name email');
    await req.project.populate('owner', 'name email');

    const [total, done] = await Promise.all([
      Task.countDocuments({ project: req.project._id }),
      Task.countDocuments({ project: req.project._id, status: 'Done' }),
    ]);

    const data = req.project.toObject();
    data.status = deriveProjectStatus(total, done);

    res.json({ success: true, data });
  })
);

// PUT /api/v1/projects/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('Admin'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim(),
    body('dueDate').optional({ nullable: true }).isISO8601().toDate().withMessage('Invalid due date'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, description, dueDate } = req.body;
    if (name) req.project.name = name;
    if (description !== undefined) req.project.description = description;
    if (dueDate !== undefined) req.project.dueDate = dueDate || null;
    await req.project.save();
    res.json({ success: true, data: req.project });
  })
);

// DELETE /api/v1/projects/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    const Task = require('../models/Task');
    await Task.deleteMany({ project: req.project._id });
    await req.project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  })
);

module.exports = router;
