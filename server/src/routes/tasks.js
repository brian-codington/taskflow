// server/src/routes/tasks.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectAccess');
const { Task, ActivityLog, User } = require('../models');

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, checkProjectAccess, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, assignee, sprint } = req.query;

    const where = { projectId };
    if (status) where.status = status;
    if (assignee) where.assigneeId = assignee;
    if (sprint) where.sprintId = sprint;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'avatarUrl'] },
        { model: User, as: 'reporter', attributes: ['id', 'name'] }
      ],
      order: [['position', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, checkProjectAccess, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, assigneeId, sprintId } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      assigneeId,
      sprintId,
      projectId,
      reporterId: req.user.id
    });

    // Log activity
    await ActivityLog.create({
      projectId,
      userId: req.user.id,
      action: 'task.created',
      metadata: { taskId: task.id, title: task.title }
    });

    // Broadcast to project room via Socket.io
    const io = req.app.get('io');
    io.to(`project:${projectId}`).emit('task:created', task);

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:taskId
router.patch('/:taskId', authenticate, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const changes = req.body;

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await task.update(changes);

    // Log activity
    await ActivityLog.create({
      projectId: task.projectId,
      userId: req.user.id,
      action: 'task.updated',
      metadata: { taskId, changes }
    });

    // Broadcast update
    const io = req.app.get('io');
    io.to(`project:${task.projectId}`).emit('task:updated', {
      taskId,
      changes,
      updatedBy: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:taskId
router.delete('/:taskId', authenticate, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await task.destroy();

    const io = req.app.get('io');
    io.to(`project:${task.projectId}`).emit('task:deleted', { taskId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
