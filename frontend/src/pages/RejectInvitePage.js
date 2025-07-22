import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../services/api';

const RejectInvitePage = () => {
  const [message, setMessage] = useState('Processing rejection...');
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
    // Call backend to reject invite
    axios.get(`${API_URL}/projects/reject-invite?token=${token}`)
      .then(res => {
        setMessage(res.data.msg || 'Invitation rejected.');
        setSuccess(true);
        window.history.replaceState({}, document.title, '/reject-invite');
      })
      .catch(err => {
        setMessage(err.response?.data?.msg || 'Failed to reject invitation.');
        setSuccess(false);
        window.history.replaceState({}, document.title, '/reject-invite');
      });
  }, [location.search]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ background: 'white', padding: '2rem 3rem', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 400 }}>
        <h2>{success ? 'Invitation Rejected' : 'Invitation'}</h2>
        <p>{message}</p>
        <button onClick={() => navigate('/login')} style={{ marginTop: '1rem', padding: '0.75rem 2rem', borderRadius: 8, background: '#e74c3c', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Go to Login</button>
      </div>
    </div>
  );
};

export default RejectInvitePage; 