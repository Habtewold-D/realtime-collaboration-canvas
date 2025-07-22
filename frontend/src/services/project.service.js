import axios from 'axios';
import { API_URL } from './api';
import authHeader from './auth-header';

const PROJECT_API_URL = `${API_URL}/projects/`;

const getProjects = () => {
  return axios.get(PROJECT_API_URL, { headers: authHeader() });
};

const createProject = (name) => {
  return axios.post(PROJECT_API_URL, { name }, { headers: authHeader() });
};

const inviteUser = (projectId, email) => {
  return axios.post(PROJECT_API_URL + `${projectId}/invite`, { email }, { headers: authHeader() });
};

const projectService = {
  getProjects,
  createProject,
  inviteUser,
};

export default projectService; 