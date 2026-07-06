// server/src/integrations/github.js
const { Octokit } = require('@octokit/rest');
const { Task, ActivityLog } = require('../models');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

/**
 * Handle incoming GitHub webhook events.
 * Links PRs and commits to TaskFlow tasks via task ID in branch name or PR title.
 * Convention: branch name or PR title should include task ID e.g. "TF-123-fix-login-bug"
 */
const handleWebhook = async (event, payload) => {
  if (event === 'pull_request') {
    await handlePullRequest(payload);
  } else if (event === 'push') {
    await handlePush(payload);
  }
};

const extractTaskId = (text) => {
  const match = text?.match(/TF-(\d+)/i);
  return match ? match[1] : null;
};

const handlePullRequest = async (payload) => {
  const { action, pull_request, repository } = payload;
  const taskId = extractTaskId(pull_request.title) || extractTaskId(pull_request.head.ref);
  if (!taskId) return;

  const task = await Task.findByPk(taskId);
  if (!task) return;

  const statusMap = {
    opened: 'IN_REVIEW',
    closed: pull_request.merged ? 'DONE' : null,
    reopened: 'IN_REVIEW'
  };

  if (statusMap[action]) {
    await task.update({ status: statusMap[action] });
    await ActivityLog.create({
      projectId: task.projectId,
      userId: null,
      action: `github.pr.${action}`,
      metadata: {
        taskId,
        prNumber: pull_request.number,
        prTitle: pull_request.title,
        prUrl: pull_request.html_url,
        repo: repository.full_name
      }
    });
  }
};

const handlePush = async (payload) => {
  const { commits, repository } = payload;
  for (const commit of commits) {
    const taskId = extractTaskId(commit.message);
    if (!taskId) continue;

    const task = await Task.findByPk(taskId);
    if (!task) continue;

    await ActivityLog.create({
      projectId: task.projectId,
      userId: null,
      action: 'github.commit.pushed',
      metadata: {
        taskId,
        sha: commit.id.slice(0, 7),
        message: commit.message,
        url: commit.url,
        repo: repository.full_name
      }
    });
  }
};

module.exports = { handleWebhook };
