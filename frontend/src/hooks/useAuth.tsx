'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface CompanyProfile {
  id: number;
  legal_business_name: string;
  vat_tax_number: string;
  payment_terms: string;
  discount_tier: string;
  credit_limit: string;
  credit_used: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  is_b2b: boolean;
  company_name: string;
  vat_number: string;
  shipping_address: string;
  billing_address: string;
  company_profile?: CompanyProfile | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // On mount, load token from localStorage and fetch profile
    const storedToken = localStorage.getItem('girlypouch_token');
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      setLoading(true);
      const profile = await api.auth.getProfile();
      setUser(profile);
    } catch (err) {
      console.error('Failed to load profile, token might be invalid:', err);
      // Clean up invalid token
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.auth.login(username, password);
      if (data.token) {
        setToken(data.token);
        const profile = await api.auth.getProfile();
        setUser(profile);
        setLoading(false);
        return data;
      }
      throw new Error('Authentication token missing from response.');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    try {
      const res = await api.auth.register(payload);
      // Auto login after registration
      await login(payload.username, payload.password);
      setLoading(false);
      return res;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setToken(null);
    setLoading(false);
  };

  const refreshProfile = async (): Promise<User> => {
    const profile = await api.auth.getProfile();
    setUser(profile);
    return profile;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
