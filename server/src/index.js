// server/src/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('redis');
const { sequelize } = require('./models');
const routes = require('./routes');
const { registerSocketHandlers } = require('./sockets');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();
const server = http.createServer(app);

// Redis client
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

// Socket.io
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Attach redis and io to app for use in routes
app.set('redis', redis);
app.set('io', io);

// Routes
app.use('/api', routes);
app.use(errorHandler);

// Socket handlers
registerSocketHandlers(io, redis);

// Database + server start
const PORT = process.env.PORT || 4000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected.');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

module.exports = { app, server };
