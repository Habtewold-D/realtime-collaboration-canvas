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
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // Check authentication on mount
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        
        if (!currentUser) {
            setLoading(false);
            return;
        }

        // Only fetch projects if user is authenticated
        projectService.getProjects().then(
            (response) => {
                setProjects(response.data);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching projects', error);
                if (error.response && error.response.status === 401) {
                    authService.logout();
                    setUser(null);
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
        setUser(null);
        setProjects([]);
    };

    const handleLogin = () => {
        navigate('/login');
    };

    const handleRegister = () => {
        navigate('/register');
    };

    const handlePublicCanvas = () => {
        navigate('/whiteboard');
    };

    // Show welcome screen for unauthenticated users
    if (!user) {
        return (
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <h1>Welcome to Realtime Collaboration Canvas</h1>
                </header>
                
                <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    maxWidth: '600px', 
                    margin: '0 auto',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    <h2 style={{ color: '#333', marginBottom: '1rem' }}>Get Started</h2>
                    <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
                        Create collaborative whiteboards, invite team members, and work together in real-time. 
                        You can start drawing immediately or create an account to save your projects.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button 
                            onClick={handlePublicCanvas}
                            style={{ 
                                padding: '1rem 2rem', 
                                borderRadius: 8, 
                                border: 'none', 
                                background: '#667eea', 
                                color: '#fff', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Start Drawing Now
                        </button>
                        <button 
                            onClick={handleLogin}
                            style={{ 
                                padding: '1rem 2rem', 
                                borderRadius: 8, 
                                border: '2px solid #667eea', 
                                background: 'transparent', 
                                color: '#667eea', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Login
                        </button>
                        <button 
                            onClick={handleRegister}
                            style={{ 
                                padding: '1rem 2rem', 
                                borderRadius: 8, 
                                border: '2px solid #28a745', 
                                background: 'transparent', 
                                color: '#28a745', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Register
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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