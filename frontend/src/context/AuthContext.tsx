import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiClient, UserProfile, ApiError } from "../api/client";

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signup: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => apiClient.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Restore authenticated session on mount if token exists
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = apiClient.getToken();
      if (!savedToken) return;

      try {
        setIsLoading(true);
        const profile = await apiClient.getMe();
        setUser(profile);
        setToken(savedToken);
      } catch (err: any) {
        // If token expired, clear it
        apiClient.setToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const signup = useCallback(async (fullName: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.signup({ fullName, email, password });
      return res;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Registration failed. Please check your inputs.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.login({ email, password });
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Login failed. Please verify your credentials.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        signup,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
