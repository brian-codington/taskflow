// server/src/sockets/index.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const taskHandler = require('./taskHandler');

/**
 * Authenticate WebSocket connections via JWT.
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'name', 'email', 'avatarUrl']
    });
    if (!user) return next(new Error('User not found'));

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

const registerSocketHandlers = (io, redis) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`[socket] User ${socket.userId} connected`);

    // Join a project room to receive project-scoped events
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`[socket] User ${socket.userId} joined project:${projectId}`);
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Register task event handlers
    taskHandler(io, socket, redis);

    socket.on('disconnect', () => {
      console.log(`[socket] User ${socket.userId} disconnected`);
    });
  });
};

module.exports = { registerSocketHandlers };
