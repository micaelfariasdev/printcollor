import axios from 'axios'

/**
 * Axios instance sem interceptors para requisições públicas.
 * NÃO adiciona Authorization header.
 * NÃO dispara logout em 401 (protegido pelo useAuth interceptor).
 * NÃO faz broadcast de SHOW_LOADING/HIDE_LOADING global.
 */
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})