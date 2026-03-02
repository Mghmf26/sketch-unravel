import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string) => {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    setProfile(p as Profile | null);
    // Prioritize admin role if user has multiple roles
    const roleList = (roles || []) as { role: string }[];
    const isAdmin = roleList.some(r => r.role === 'admin');
    setRole(isAdmin ? 'admin' : (roleList[0]?.role ?? 'user'));
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRole(user.id);
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!isMounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          fetchProfileAndRole(sess.user.id);
          // Update last_sign_in
          supabase.from('profiles').update({ last_sign_in: new Date().toISOString() }).eq('user_id', sess.user.id).then(() => {});
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    const initAuth = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await fetchProfileAndRole(sess.user.id);
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
