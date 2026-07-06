// server/src/sockets/taskHandler.js
const { Task, ActivityLog } = require('../models');
const { checkProjectAccess } = require('../middleware/projectAccess');

const taskHandler = (io, socket, redis) => {
  /**
   * Handle real-time task updates from connected clients.
   * Validates access, persists changes, and broadcasts to the project room.
   */
  socket.on('task:update', async ({ taskId, changes, projectId }) => {
    try {
      // Validate user has permission for this project
      const hasAccess = await checkProjectAccess(socket.userId, projectId);
      if (!hasAccess) {
        return socket.emit('error', { message: 'Access denied' });
      }

      // Persist to database
      const task = await Task.findByPk(taskId);
      if (!task) return socket.emit('error', { message: 'Task not found' });

      await task.update(changes);

      // Broadcast to all users in the project room
      io.to(`project:${projectId}`).emit('task:updated', {
        taskId,
        changes: task.toJSON(),
        updatedBy: socket.userId,
        timestamp: new Date().toISOString()
      });

      // Log activity
      await ActivityLog.create({
        projectId,
        userId: socket.userId,
        action: 'task.updated',
        metadata: { taskId, changes }
      });

    } catch (err) {
      console.error('task:update error', err);
      socket.emit('error', { message: 'Failed to update task' });
    }
  });

  /**
   * Handle task position updates (drag-and-drop reordering).
   */
  socket.on('task:reorder', async ({ projectId, taskId, newPosition, newStatus }) => {
    try {
      const hasAccess = await checkProjectAccess(socket.userId, projectId);
      if (!hasAccess) return socket.emit('error', { message: 'Access denied' });

      await Task.update(
        { position: newPosition, status: newStatus },
        { where: { id: taskId } }
      );

      io.to(`project:${projectId}`).emit('task:reordered', {
        taskId,
        newPosition,
        newStatus,
        movedBy: socket.userId
      });
    } catch (err) {
      console.error('task:reorder error', err);
      socket.emit('error', { message: 'Failed to reorder task' });
    }
  });
};

module.exports = taskHandler;
