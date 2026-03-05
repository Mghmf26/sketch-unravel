import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthenticatorAssuranceLevels } from '@supabase/supabase-js';

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
  mfaEnabled: boolean;
  mfaVerified: boolean;
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
  isRoot: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshMFA: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [nextLevel, setNextLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [isRoot, setIsRoot] = useState(false);

  const fetchProfileAndRole = async (userId: string) => {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    setProfile(p as Profile | null);
    const roleList = (roles || []) as { role: string }[];
    const hasRoot = roleList.some(r => r.role === 'root');
    const hasAdmin = roleList.some(r => r.role === 'admin');
    setIsRoot(hasRoot);
    if (hasRoot) {
      setRole('admin'); // root acts as admin in the UI
    } else if (hasAdmin) {
      setRole('admin');
    } else {
      setRole(roleList[0]?.role ?? 'user');
    }
  };

  const refreshMFA = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return;
    setCurrentLevel(data.currentLevel);
    setNextLevel(data.nextLevel);
    setMfaEnabled(data.nextLevel === 'aal2');
    setMfaVerified(data.currentLevel === 'aal2');
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
          refreshMFA();
          supabase.from('profiles').update({ last_sign_in: new Date().toISOString() }).eq('user_id', sess.user.id).then(() => {});
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setIsRoot(false);
        setMfaEnabled(false);
        setMfaVerified(false);
        setCurrentLevel(null);
        setNextLevel(null);
      }
    });

    const initAuth = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await fetchProfileAndRole(sess.user.id);
        await refreshMFA();
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
    setIsRoot(false);
    setMfaEnabled(false);
    setMfaVerified(false);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, role, loading,
      mfaEnabled, mfaVerified, currentLevel, nextLevel,
      isRoot,
      signOut, refreshProfile, refreshMFA,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
