import { useState } from 'react';
import axios from 'axios';

// Instância principal do Axios
export const api = axios.create({
  baseURL: 'https://printcollor.micaelfarias.com/api/',
});

// Interceptor para injetar o Token e gerenciar Refresh
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('https://printcollor.micaelfarias.com/api/token/refresh/', {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', data.access);
          return api(originalRequest);
        } catch (err) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  const login = async (credentials: any) => {
    const { data } = await axios.post('https://printcollor.micaelfarias.com/api/token/', credentials);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser({ loggedIn: true });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, login, logout };
};