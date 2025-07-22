import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import RejectInvitePage from './pages/RejectInvitePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate replace to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/reject-invite" element={<RejectInvitePage />} />
      </Routes>
    </Router>
  );
}

export default App;
