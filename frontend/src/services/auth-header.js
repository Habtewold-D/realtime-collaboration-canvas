import authService from './auth.service';

export default function authHeader() {
  const user = authService.getCurrentUser();

  if (user && user.token) {
    return { 'x-auth-token': user.token };
  } else {
    return {};
  }
} 