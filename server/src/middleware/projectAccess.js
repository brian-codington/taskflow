// server/src/middleware/projectAccess.js
const { ProjectMember } = require('../models');

/**
 * Express middleware — checks req.user has access to req.params.projectId.
 */
const checkProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    const member = await ProjectMember.findOne({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Standalone function for use in socket handlers (no req/res).
 */
const checkProjectAccessByIds = async (userId, projectId) => {
  const member = await ProjectMember.findOne({ where: { projectId, userId } });
  return !!member;
};

module.exports = { checkProjectAccess, checkProjectAccessByIds };
