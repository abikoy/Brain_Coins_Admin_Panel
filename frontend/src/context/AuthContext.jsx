import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentSession, onAuthStateChange, signOutAdmin } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        });
        setSession(session);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setSession(null);
        setIsLoggedIn(false);
      }
      
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { session } = await getCurrentSession();
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        });
        setSession(session);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
    setSession(userData.session);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      await signOutAdmin();
      setUser(null);
      setSession(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
      setSession(null);
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
