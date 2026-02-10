import { useState } from 'react';
import axios from 'axios';

// --- CONTROLE GLOBAL DE LOADING ---
// Usamos um contador para não fechar o loading se houver requisições simultâneas
let activeRequests = 0;

const showLoading = () => {
  activeRequests++;
  document.dispatchEvent(new CustomEvent('SHOW_LOADING'));
};

const hideLoading = () => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    document.dispatchEvent(new CustomEvent('HIDE_LOADING'));
  }
};

// Instância principal do Axios
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para injetar o Token e disparar o Loading
api.interceptors.request.use((config) => {
  showLoading(); 
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  hideLoading();
  return Promise.reject(error);
});

// Interceptor de Resposta para Refresh Token e fechar o Loading
api.interceptors.response.use(
  (response) => {
    hideLoading();
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Se o erro não for 401 ou já tivermos tentado o refresh, encerra o loading
    if (error.response?.status !== 401 || originalRequest._retry) {
      hideLoading();
      return Promise.reject(error);
    }

    // Lógica de Refresh Token
    originalRequest._retry = true;
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {
      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}token/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem('access_token', data.access);
        
        // Refaz a requisição original com o novo token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (err) {
        hideLoading();
        localStorage.clear();
        window.location.href = '/login';
      }
    } else {
      hideLoading();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  const login = async (credentials: any) => {
    showLoading();
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}token/`, credentials);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      setUser({ loggedIn: true });
    } finally {
      hideLoading();
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, login, logout };
};