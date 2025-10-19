/**
 * FRONTEND - Supabase Client
 * This file contains the browser-side Supabase client for authentication
 * Used by React components in the frontend
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Configuration (Frontend)
const supabaseUrl = "https://jgtjkqwephakgpxvvxsr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGprcXdlcGhha2dweHZ2eHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDIyNjYsImV4cCI6MjA3NjI3ODI2Nn0.ozPWNdgWmcTfFzetvxS-y3zq204fdx--kkyiIMCaTZQ";

// Initialize Supabase client for frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Sign in admin user with email and password
 * @param {string} email - Admin email address
 * @param {string} password - Admin password
 * @returns {Promise<{user, session}>} - User and session data
 * @throws {Error} - Authentication error
 */
export const signInAdmin = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Authentication failed');
    }

    if (!data.user || !data.session) {
      throw new Error('Invalid authentication response');
    }

    return {
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('[Frontend] Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out the current admin user
 * @returns {Promise<void>}
 * @throws {Error} - Sign out error
 */
export const signOutAdmin = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new Error(error.message || 'Sign out failed');
    }
  } catch (error) {
    console.error('[Frontend] Sign out error:', error);
    throw error;
  }
};

/**
 * Get the current session
 * @returns {Promise<{session}>} - Current session or null
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(error.message || 'Failed to get session');
    }
    
    return data;
  } catch (error) {
    console.error('[Frontend] Get session error:', error);
    return { session: null };
  }
};

/**
 * Get the current user
 * @returns {Promise<{user}>} - Current user or null
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      throw new Error(error.message || 'Failed to get user');
    }
    
    return data;
  } catch (error) {
    console.error('[Frontend] Get user error:', error);
    return { user: null };
  }
};

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Object} - Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

export default supabase;
