'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';
import { User, LoginCredentials, RegisterCredentials, TokenPair } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Check user permissions
  const hasPermission = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  // Check user role
  const hasRole = useCallback((role: string): boolean => {
    return user?.role?.name === role;
  }, [user]);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      
      if (response.user && response.tokens) {
        setUser(response.user);
        
        // Store tokens
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
        
        toast.success('Login successful');
        
        // Redirect based on role
        const redirectPath = getRedirectPath(response.user.role.name);
        router.push(redirectPath);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setLoading(true);
      const response = await authService.register(credentials);
      
      if (response.user && response.tokens) {
        setUser(response.user);
        
        // Store tokens
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
        
        toast.success('Registration successful');
        
        // Redirect based on role
        const redirectPath = getRedirectPath(response.user.role.name);
        router.push(redirectPath);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout API
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local state
      setUser(null);
      
      // Clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      toast.success('Logged out successfully');
      router.push('/auth/login');
    }
  };

  // Refresh token function
  const refreshToken = async (): Promise<void> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const tokens = await authService.refreshToken(storedRefreshToken);
      
      // Update stored tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // Get updated user info
      const userInfo = await authService.getCurrentUser();
      setUser(userInfo);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout on refresh failure
      await logout();
    }
  };

  // Get redirect path based on user role
  const getRedirectPath = (roleName: string): string => {
    switch (roleName) {
      case 'Super Admin':
        return '/dashboard';
      case 'Admin':
        return '/dashboard';
      case 'Subordinate':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken && refreshToken) {
          // Try to get current user info
          try {
            const userInfo = await authService.getCurrentUser();
            setUser(userInfo);
          } catch (error: any) {
            // Token might be expired, try to refresh
            if (error.response?.status === 401) {
              try {
                await refreshToken();
              } catch (refreshError) {
                // Refresh failed, clear tokens
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
              }
            } else {
              // Other error, clear tokens
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (access token expires in 15 minutes)
    const interval = setInterval(() => {
      refreshToken();
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshToken,
    isAuthenticated,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions?: string[],
  requiredRole?: string
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading, hasPermission, hasRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/login');
        return;
      }

      if (user && requiredRole && !hasRole(requiredRole)) {
        toast.error('Access denied: Insufficient role permissions');
        router.push('/dashboard');
        return;
      }

      if (user && requiredPermissions) {
        const hasRequiredPermissions = requiredPermissions.every(permission =>
          hasPermission(permission)
        );

        if (!hasRequiredPermissions) {
          toast.error('Access denied: Insufficient permissions');
          router.push('/dashboard');
          return;
        }
      }
    }, [user, loading, hasPermission, hasRole, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-600"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}