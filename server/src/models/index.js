// server/src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// ── User ──────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:         { type: DataTypes.STRING, allowNull: false },
  email:        { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  avatarUrl:    { type: DataTypes.STRING },
  role:         { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' }
});

// ── Project ───────────────────────────────────────────────────────────────
const Project = sequelize.define('Project', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  slug:        { type: DataTypes.STRING, unique: true }
});

// ── ProjectMember ─────────────────────────────────────────────────────────
const ProjectMember = sequelize.define('ProjectMember', {
  role: { type: DataTypes.ENUM('admin', 'developer', 'viewer'), defaultValue: 'developer' }
});

// ── Sprint ────────────────────────────────────────────────────────────────
const Sprint = sequelize.define('Sprint', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:      { type: DataTypes.STRING, allowNull: false },
  startDate: { type: DataTypes.DATEONLY },
  endDate:   { type: DataTypes.DATEONLY },
  status:    { type: DataTypes.ENUM('PLANNING', 'ACTIVE', 'COMPLETED'), defaultValue: 'PLANNING' },
  goal:      { type: DataTypes.TEXT }
});

// ── Task ──────────────────────────────────────────────────────────────────
const Task = sequelize.define('Task', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status:      { type: DataTypes.ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'), defaultValue: 'TODO' },
  priority:    { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'), defaultValue: 'MEDIUM' },
  position:    { type: DataTypes.INTEGER, defaultValue: 0 },
  storyPoints: { type: DataTypes.INTEGER },
  dueDate:     { type: DataTypes.DATEONLY }
});

// ── ActivityLog ───────────────────────────────────────────────────────────
const ActivityLog = sequelize.define('ActivityLog', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  action:   { type: DataTypes.STRING, allowNull: false },
  metadata: { type: DataTypes.JSONB }
});

// ── Associations ──────────────────────────────────────────────────────────
Project.belongsToMany(User, { through: ProjectMember });
User.belongsToMany(Project, { through: ProjectMember });

Project.hasMany(Sprint, { foreignKey: 'projectId' });
Sprint.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(Task, { foreignKey: 'projectId' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

Sprint.hasMany(Task, { foreignKey: 'sprintId' });
Task.belongsTo(Sprint, { foreignKey: 'sprintId' });

Task.belongsTo(User, { as: 'assignee', foreignKey: 'assigneeId' });
Task.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });

Project.hasMany(ActivityLog, { foreignKey: 'projectId' });
User.hasMany(ActivityLog, { foreignKey: 'userId' });

module.exports = { sequelize, User, Project, ProjectMember, Sprint, Task, ActivityLog };
