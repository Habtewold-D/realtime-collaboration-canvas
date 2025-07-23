import React, { useState, useEffect } from 'react';
import projectService from '../services/project.service';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const DashboardPage = () => {
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [inviteEmail, setInviteEmail] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        projectService.getProjects().then(
            (response) => {
                setProjects(response.data);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching projects', error);
                if (error.response && error.response.status === 401) {
                    authService.logout();
                    navigate('/login');
                }
                setError('Failed to load projects.');
                setLoading(false);
            }
        );
    }, [navigate]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        try {
            const response = await projectService.createProject(newProjectName);
            setProjects([...projects, response.data]);
            setNewProjectName('');
        } catch (error) {
            console.error('Error creating project', error);
            setError('Failed to create project.');
        }
    };

    const handleInviteUser = async (e, projectId) => {
        e.preventDefault();
        const email = inviteEmail[projectId];
        if (!email || !email.trim()) return;
        try {
            await projectService.inviteUser(projectId, email);
            // Optionally, refresh project data or show a success message
            alert('Invitation sent successfully!');
            setInviteEmail({ ...inviteEmail, [projectId]: '' });
        } catch (error) {
            console.error('Error sending invite', error);
            alert(error.response?.data?.msg || 'Failed to send invitation.');
        }
    };

    const handleInviteEmailChange = (e, projectId) => {
        setInviteEmail({ ...inviteEmail, [projectId]: e.target.value });
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>My Dashboard</h1>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </header>

            <div className="create-project-form">
                <form onSubmit={handleCreateProject}>
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter new project name"
                    />
                    <button type="submit">Create Project</button>
                </form>
            </div>

            {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p>Loading projects...</p>
            ) : (
                <div className="project-list">
                    {projects.map((project) => (
                        <div key={project._id} className="project-card">
                            <h2>{project.name}</h2>
                            <p>Owner: {project.owner.email}</p>
                            <div className="collaborators">
                                <strong>Collaborators:</strong>
                                <ul>
                                    {project.collaborators.map(c => <li key={c._id}>{c.email}</li>)}
                                </ul>
                            </div>
                            <form onSubmit={(e) => handleInviteUser(e, project._id)} className="invite-form">
                                <input
                                    type="email"
                                    value={inviteEmail[project._id] || ''}
                                    onChange={(e) => handleInviteEmailChange(e, project._id)}
                                    placeholder="Invite user by email"
                                />
                                <button type="submit">Invite</button>
                            </form>
                            <button
                              style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: '#667eea', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => navigate(`/project/${project._id}/whiteboard`)}
                            >
                              Open Whiteboard
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardPage; 