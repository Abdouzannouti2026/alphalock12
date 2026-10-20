
import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://vjcfqgzbzskfihtkanza.supabase.co').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x_iYgckRVzAjsrR9oAreoA_wz11aNiz').trim();

// Sanitize Supabase URL: strip trailing slashes, /rest/v1, /auth/v1
const cleanSupabaseUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/auth\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
};

const SUPABASE_URL = cleanSupabaseUrl(rawUrl);
const SUPABASE_ANON_KEY = rawKey;

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.log('Supabase falling back to default URL');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

if (typeof window !== 'undefined') {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase.auth') || key.includes('sb-'))) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (
              !parsed ||
              !parsed.refresh_token ||
              parsed.refresh_token === '' || 
              parsed.refresh_token === null || 
              (parsed.currentSession && !parsed.currentSession.refresh_token) ||
              (parsed.error && (String(parsed.error).includes('Refresh Token') || String(parsed.error).includes('not_found')))
            ) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error inspecting localStorage for auth tokens:", e);
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);
    if (
      reasonStr.includes('Refresh Token') ||
      reasonStr.includes('refresh_token_not_found') ||
      reasonStr.includes('Invalid Refresh Token') ||
      reasonStr.includes('invalid_grant') ||
      reasonStr.includes('Auth session missing')
    ) {
      console.warn('Caught unhandled rejection for Invalid Refresh Token, clearing stale session tokens.');
      event.preventDefault();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error("Error clearing auth storage keys:", e);
      }
    }
  });
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: (() => {
      try {
        return window.localStorage;
      } catch (e) {
        return undefined;
      }
    })()
  }
});

// Guard auth methods to prevent unhandled rejections from invalid refresh tokens
if (typeof window !== 'undefined' && supabase?.auth) {
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async () => {
    try {
      const res = await originalGetSession();
      if (res.error) {
        const errMsg = (res.error.message || '').toLowerCase();
        if (
          errMsg.includes('refresh token') ||
          errMsg.includes('invalid') ||
          errMsg.includes('auth session') ||
          errMsg.includes('not found') ||
          errMsg.includes('jwt') ||
          errMsg.includes('invalid_grant')
        ) {
          console.warn("Handled getSession auth error gracefully:", res.error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          return { data: { session: null }, error: null };
        }
      }
      return res;
    } catch (err: any) {
      console.warn("Handled getSession exception gracefully:", err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return { data: { session: null }, error: null };
    }
  };

  const originalRefreshSession = supabase.auth.refreshSession.bind(supabase.auth);
  supabase.auth.refreshSession = async (currentSession?: any) => {
    try {
      const res = await originalRefreshSession(currentSession);
      if (res.error) {
        const errMsg = (res.error.message || '').toLowerCase();
        if (
          errMsg.includes('refresh token') ||
          errMsg.includes('invalid') ||
          errMsg.includes('not found') ||
          errMsg.includes('jwt') ||
          errMsg.includes('invalid_grant')
        ) {
          console.warn("Handled refreshSession auth error gracefully:", res.error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          return { data: { session: null, user: null }, error: null };
        }
      }
      return res;
    } catch (err: any) {
      console.warn("Handled refreshSession exception gracefully:", err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return { data: { session: null, user: null }, error: null };
    }
  };

  const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
  supabase.auth.signOut = async (options?: { scope?: 'global' | 'local' | 'others' }) => {
    try {
      return await originalSignOut({ scope: options?.scope || 'local' });
    } catch (err) {
      console.warn("SignOut error handled locally:", err);
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (_) {}
      return { error: null };
    }
  };
}
