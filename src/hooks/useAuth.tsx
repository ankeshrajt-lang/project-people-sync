import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            // Check admin status
            const { data: adminData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .maybeSingle();

            // STRICT ADMIN CHECK: Only vijay@shreellc.tech can be admin
            const isEmailMatch = session.user.email === 'vijay@shreellc.tech';
            const userIsAdmin = !!adminData && isEmailMatch;

            setIsAdmin(userIsAdmin);

            // If admin, always approved
            if (userIsAdmin) {
              setIsApproved(true);
              setLoading(false);
              return;
            }

            // Check team_members approval status for employees
            const { data: memberData } = await supabase
              .from("team_members")
              .select("is_approved")
              .eq("auth_user_id", session.user.id)
              .maybeSingle();

            // If no team_member record, they might be a manager/admin without entry
            if (!memberData) {
              // Fallback: Check metadata. If they are an 'employee' but have no record, block them.
              const role = session.user.user_metadata?.role;
              if (role === 'employee') {
                setIsApproved(false); // Pending/Broken state
              } else {
                setIsApproved(true); // Customers/Legacy allow access
              }
            } else {
              setIsApproved(memberData.is_approved ?? false);
            }

            // FORCE BLOCK: Check against explicit list
            // Note: We check if the email STARTS with the problematic usernames to be safe
            if (session.user.email?.startsWith('vijayputta41') || session.user.email?.startsWith('vijayputta45')) {
              setIsApproved(false);
            }

            setLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsApproved(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Check admin status
        const { data: adminData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        // STRICT ADMIN CHECK: Only vijay@shreellc.tech can be admin
        const isEmailMatch = session.user.email === 'vijay@shreellc.tech';
        const userIsAdmin = !!adminData && isEmailMatch;

        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          setIsApproved(true);
          setLoading(false);
          return;
        }

        // Check approval status
        const { data: memberData } = await supabase
          .from("team_members")
          .select("is_approved")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (!memberData) {
          // Fallback: Check metadata. If they are an 'employee' but have no record, block them.
          const role = session.user.user_metadata?.role;
          if (role === 'employee') {
            setIsApproved(false); // Pending/Broken state
          } else {
            setIsApproved(true); // Customers/Legacy allow access
          }
        } else {
          setIsApproved(memberData.is_approved ?? false);
        }

        // FORCE BLOCK: Check against explicit list
        if (session.user.email?.startsWith('vijayputta41') || session.user.email?.startsWith('vijayputta45')) {
          setIsApproved(false);
        }

        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsApproved(null);
  };

  // Explicit Block List for broken legacy users
  const BLOCKED_EMAILS = [
    'vijayputta41@gmail.com', // Assuming gmail, or just prefix matching if needed
    'vijayputta45@gmail.com'
  ];

  return { user, session, loading, isAdmin, isApproved, signOut };
}