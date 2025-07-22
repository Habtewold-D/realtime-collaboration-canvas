const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const projectController = require('../controllers/project.controller');

// @route   GET api/projects
// @desc    Get all projects for a user
// @access  Private
router.get('/', auth, projectController.getProjects);

// @route   POST api/projects
// @desc    Create a new project
// @access  Private
router.post('/', auth, projectController.createProject);

// @route   POST api/projects/:id/invite
// @desc    Invite a user to a project
// @access  Private
router.post('/:id/invite', auth, projectController.inviteUser);

// Accept invitation (no auth, by token)
router.get('/accept-invite', projectController.acceptInvite);
// Reject invitation (no auth, by token)
router.get('/reject-invite', projectController.rejectInvite);

module.exports = router; 