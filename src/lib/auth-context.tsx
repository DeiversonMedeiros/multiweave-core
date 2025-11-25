import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOfflineAuth } from "@/hooks/useOfflineAuth";
import { loginService } from "@/services/auth/loginService";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (loginInput: string, password: string) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signIn: async () => ({ error: 'Not implemented' }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { saveAuthCache, clearAuthCache, cachedAuth, cachedUserData } = useOfflineAuth();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Salvar dados de autenticação no cache offline
        if (session?.user) {
          saveAuthCache(session, session.user);
        } else {
          clearAuthCache();
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Salvar dados de autenticação no cache offline se já estiver logado
      if (session?.user) {
        saveAuthCache(session, session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (loginInput: string, password: string) => {
    const resolved = await loginService.resolveEmail(loginInput);

    if (resolved.error || !resolved.email) {
      return { error: resolved.error ?? 'Erro ao resolver email' };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro inesperado ao fazer login' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signIn }}>
      {children}
    </AuthContext.Provider>
  );
};
