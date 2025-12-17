import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const memoryStorage: Record<string, string> = {};

const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return memoryStorage[key] || null;
    }
  }
};

const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  }
};

const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    try {
      sessionStorage.removeItem(key);
    } catch {
      delete memoryStorage[key];
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      getItem: getStorageItem,
      setItem: setStorageItem,
      removeItem: removeStorageItem
    }
  }
});
