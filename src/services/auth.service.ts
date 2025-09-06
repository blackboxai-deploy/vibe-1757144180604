import axios, { AxiosResponse } from 'axios';
import { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse, 
  TokenPair, 
  User, 
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const tokens = await authService.refreshToken(refreshToken);
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/register', credentials);
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const response: AxiosResponse<TokenPair> = await apiClient.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post('/auth/logout');
    return response.data;
  },

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.put('/auth/change-password', data);
    return response.data;
  },

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post('/auth/forgot-password', data);
    return response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(`/auth/verify-email/${token}`);
    return response.data;
  },

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post('/auth/resend-verification');
    return response.data;
  },
};

export default authService;