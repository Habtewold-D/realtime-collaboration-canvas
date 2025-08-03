import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import RejectInvitePage from './pages/RejectInvitePage';
import WhiteboardPage from './pages/WhiteboardPage';
import PublicWhiteboardPage from './pages/PublicWhiteboardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate replace to="/dashboard" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/reject-invite" element={<RejectInvitePage />} />
        <Route path="/whiteboard" element={<PublicWhiteboardPage />} />
        <Route path="/project/:id/whiteboard" element={<WhiteboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
