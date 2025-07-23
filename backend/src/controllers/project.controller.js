const Project = require('../models/Project');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Get all projects for a user
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [{ owner: req.user.id }, { collaborators: req.user.id }],
        }).populate('owner', 'email').populate('collaborators', 'email');
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Create a new project
exports.createProject = async (req, res) => {
    const { name } = req.body;
    try {
        const newProject = new Project({
            name,
            owner: req.user.id,
            collaborators: [req.user.id] // Owner is a collaborator by default
        });
        const project = await newProject.save();
        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Invite a user to a project (send email with accept/reject links)
exports.inviteUser = async (req, res) => {
    const { email } = req.body;
    const projectId = req.params.id;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized to invite' });
        }
        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            return res.status(404).json({ msg: 'User to invite not found' });
        }
        // Check for existing pending invitation
        const existingInvite = await Invitation.findOne({ projectId, email, status: 'pending' });
        if (existingInvite) {
            return res.status(400).json({ msg: 'An invitation is already pending for this user.' });
        }
        // Check if already a collaborator
        if (project.collaborators.includes(userToInvite.id)) {
            return res.status(400).json({ msg: 'User is already a collaborator' });
        }
        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        // Save invitation
        const invitation = new Invitation({
            projectId,
            email,
            token,
            expiresAt,
        });
        await invitation.save();
        // Fetch the owner's email
        const ownerUser = await User.findById(project.owner);
        const ownerEmail = ownerUser ? ownerUser.email : 'the owner';
        // Email setup
        const acceptUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
        const rejectUrl = `${process.env.FRONTEND_URL}/reject-invite?token=${token}`;
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Invitation to collaborate on "${project.name}"` ,
            html: `<p>You have been invited by <b>${ownerEmail}</b> to collaborate on the project <b>${project.name}</b>.</p>
                   <p>Project created: ${project.createdAt.toLocaleString()}</p>
                   <p><a href="${acceptUrl}">Accept Invitation</a> | <a href="${rejectUrl}">Reject Invitation</a></p>
                   <p>This invitation will expire in 1 hour.</p>`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log('Invitation email sent: ' + info.response);
            }
        });
        res.json({ msg: 'Invitation sent.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Accept an invitation by token
exports.acceptInvite = async (req, res) => {
    const { token } = req.query;
    try {
        const invitation = await Invitation.findOne({ token });
        if (!invitation) {
            return res.status(404).json({ msg: 'Invitation not found.' });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({ msg: 'Invitation already processed.' });
        }
        if (invitation.expiresAt < new Date()) {
            return res.status(400).json({ msg: 'Invitation has expired.' });
        }
        // Find the user by email
        const user = await User.findOne({ email: invitation.email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found. Please register first.' });
        }
        // Add user as collaborator if not already
        const project = await Project.findById(invitation.projectId);
        if (!project) {
            return res.status(404).json({ msg: 'Project not found.' });
        }
        if (!project.collaborators.includes(user._id)) {
            project.collaborators.push(user._id);
            await project.save();
        }
        invitation.status = 'accepted';
        await invitation.save();
        res.json({ msg: 'Invitation accepted. You are now a collaborator.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Reject an invitation by token
exports.rejectInvite = async (req, res) => {
    const { token } = req.query;
    try {
        const invitation = await Invitation.findOne({ token });
        if (!invitation) {
            return res.status(404).json({ msg: 'Invitation not found.' });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({ msg: 'Invitation already processed.' });
        }
        if (invitation.expiresAt < new Date()) {
            return res.status(400).json({ msg: 'Invitation has expired.' });
        }
        invitation.status = 'rejected';
        await invitation.save();
        res.json({ msg: 'Invitation rejected.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Save canvas data for a project
exports.saveCanvasData = async (req, res) => {
    const { id } = req.params;
    const { canvasData } = req.body;
    try {
        console.log(`[DEBUG] saveCanvasData called by user: ${req.user.id} for project: ${id}`);
        const project = await Project.findById(id);
        if (!project) {
            console.log('[DEBUG] Project not found:', id);
            return res.status(404).json({ msg: 'Project not found' });
        }
        // Only allow owner or collaborator
        if (
            project.owner.toString() !== req.user.id &&
            !project.collaborators.map(String).includes(req.user.id)
        ) {
            console.log('[DEBUG] Not authorized:', req.user.id);
            return res.status(401).json({ msg: 'Not authorized' });
        }
        console.log('[DEBUG] Saving canvasData to DB:', canvasData);
        project.canvasData = canvasData;
        await project.save();
        res.json({ msg: 'Canvas data saved.', saved: project.canvasData });
    } catch (err) {
        console.error('[DEBUG] Error in saveCanvasData:', err.message);
        res.status(500).send('Server Error');
    }
};

// Get canvas data for a project
exports.getCanvasData = async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`[DEBUG] getCanvasData called by user: ${req.user.id} for project: ${id}`);
        const project = await Project.findById(id);
        if (!project) {
            console.log('[DEBUG] Project not found:', id);
            return res.status(404).json({ msg: 'Project not found' });
        }
        // Only allow owner or collaborator
        if (
            project.owner.toString() !== req.user.id &&
            !project.collaborators.map(String).includes(req.user.id)
        ) {
            console.log('[DEBUG] Not authorized:', req.user.id);
            return res.status(401).json({ msg: 'Not authorized' });
        }
        console.log('[DEBUG] Returning canvasData from DB:', project.canvasData);
        res.json({ canvasData: project.canvasData });
    } catch (err) {
        console.error('[DEBUG] Error in getCanvasData:', err.message);
        res.status(500).send('Server Error');
    }
}; 