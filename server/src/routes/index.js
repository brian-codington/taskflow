// server/src/routes/index.js
const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/projects', require('./projects'));
router.use('/projects/:projectId/tasks', require('./tasks'));
router.use('/projects/:projectId/sprints', require('./sprints'));

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
