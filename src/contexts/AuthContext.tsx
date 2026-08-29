import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "judge" | "coordinator";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      setRole((data?.role as AppRole | null) ?? null);
    } catch (e) {
      console.error("fetchRole failed", e);
      setRole(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "TOKEN_REFRESHED" && !session) {
          // Stale refresh token — clear it so the user can sign in again
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Defer to avoid blocking the auth callback
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchRole(session.user.id), 0);
      }
      setLoading(false);
    }).catch((e) => {
      console.error("getSession failed", e);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const attempt = () =>
      supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    let result;
    try {
      result = await attempt();
    } catch (e) {
      // Network hiccup or stale local session — clear and retry once
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      result = await attempt();
    }
    if (result.error) throw result.error;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut failed", e);
    } finally {
      setRole(null);
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
