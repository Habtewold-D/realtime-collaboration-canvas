import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../services/api';

const AcceptInvitePage = () => {
  const [message, setMessage] = useState('Processing invitation...');
  const [success, setSuccess] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      setMessage('Invalid invitation link.');
      setSuccess(false);
      return;
    }
    // Call backend to accept invite
    axios.get(`${API_URL}/projects/accept-invite?token=${token}`)
      .then(res => {
        setMessage(res.data.msg || 'Invitation accepted!');
        setSuccess(true);
        // Remove token from URL for security
        window.history.replaceState({}, document.title, '/accept-invite');
      })
      .catch(err => {
        setMessage(err.response?.data?.msg || 'Failed to accept invitation.');
        setSuccess(false);
        window.history.replaceState({}, document.title, '/accept-invite');
      });
  }, [location.search]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ background: 'white', padding: '2rem 3rem', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 400 }}>
        <h2>{success ? 'Success!' : 'Invitation'}</h2>
        <p>{message}</p>
        <button onClick={() => navigate('/login')} style={{ marginTop: '1rem', padding: '0.75rem 2rem', borderRadius: 8, background: '#667eea', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Go to Login</button>
      </div>
    </div>
  );
};

export default AcceptInvitePage; 