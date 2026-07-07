const Project = require('../models/Project');

/**
 * requireRole('Admin') — verifies req.user is a member of the project
 * with the given role (or higher).
 *
 * Also attaches req.project for downstream use.
 */
const requireRole = (minRole) => async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const membership = project.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Access denied: not a project member' });
    }

    if (minRole === 'Admin' && membership.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
    }

    req.project = project;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireRole;
