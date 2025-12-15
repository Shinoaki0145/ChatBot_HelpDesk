'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthState {
  userId: string | null;
  email: string | null;
  packageType: string | null;
  isLoading: boolean,
  isAuth: boolean;
}

const defaultAuthState: AuthState = {
  userId: null,
  email: null,
  packageType: null,
  isLoading: true,
  isAuth: false,
};

const AuthContext = createContext<AuthState>(defaultAuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  useEffect(() => {
    async function fetchSession() {
      const response = await fetch('/api/session'); 
      const data = await response.json();
      if (response.ok) {
        setAuthState({
          userId: data.userId,
          email: data.email,
          packageType: data.packageType,
          isLoading: false,
          isAuth: true,
        });
      } 
      else {
        setAuthState(prevAuthState => ({ 
            ...prevAuthState, 
            isLoading: false,
            isAuth: false,
            userId: null, 
            email: null,
            packageType: null,
          }));
      }
    }
    
    fetchSession();
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};