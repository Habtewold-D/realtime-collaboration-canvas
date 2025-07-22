const Project = require('../models/Project');
const User = require('../models/User');
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

// Invite a user to a project
exports.inviteUser = async (req, res) => {
    const { email } = req.body;
    const projectId = req.params.id;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }

        // Check if the inviting user is the owner
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized to invite' });
        }

        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            return res.status(404).json({ msg: 'User to invite not found' });
        }

        if (project.collaborators.includes(userToInvite.id)) {
            return res.status(400).json({ msg: 'User is already a collaborator' });
        }

        // For simplicity, we'll add the user directly.
        // In a real-world scenario, you would send an email with a token.
        project.collaborators.push(userToInvite.id);
        await project.save();
        
        // --- Nodemailer Email Sending Logic ---
        // This part is for demonstration. You need to configure your own SMTP transport.
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
            auth: {
                user: process.env.EMAIL_USER, // your email address
                pass: process.env.EMAIL_PASS, // your email password or app password
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `You have been invited to collaborate on "${project.name}"`,
            text: `Hello,\n\nYou have been invited to collaborate on the project "${project.name}".\n\nPlease log in to view the project.\n\nThank you!`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                // We don't block the response for the email failure
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.json(project.collaborators);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}; 