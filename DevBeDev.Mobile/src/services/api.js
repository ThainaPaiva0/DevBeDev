import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_HOST =
  Platform.OS === 'web' ? 'http://localhost:5091' : 'http://192.168.15.7:5091';

export const API_BASE_URL = `${API_HOST}/api`;

const TOKEN_KEY = 'jwt_token';

export async function getToken() {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  try {
    if (Platform.OS === 'web') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
      return;
    }
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    // Falha silenciosa ao persistir token
  }
}

export async function removeToken() {
  await setToken(null);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const mensagem =
      (data && typeof data === 'object' && (data.mensagem || data.Message)) ||
      (typeof data === 'string' && data.trim()) ||
      error?.message ||
      'Erro de comunicação com o servidor.';

    error.message = mensagem;
    return Promise.reject(error);
  }
);

export default api;