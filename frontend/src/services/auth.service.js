import axios from 'axios';
import { API_URL } from './api';

const AUTH_API_URL = `${API_URL}/auth/`;

const register = (email, password) => {
  return axios.post(AUTH_API_URL + 'register', {
    email,
    password,
  });
};

const login = (email, password) => {
  return axios.post(AUTH_API_URL + 'login', {
    email,
    password,
  }).then(response => {
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  });
};

const logout = () => {
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    // If parsing fails, the data is corrupt, so remove it.
    localStorage.removeItem('user');
    return null;
  }
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
};

export default authService; 