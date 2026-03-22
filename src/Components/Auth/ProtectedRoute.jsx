import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient';

const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async (userSession) => {
      if (!userSession?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('users_profile')
          .select('status')
          .eq('id', userSession.user.id)
          .single();

        if (isMounted) {
          if (error) {
            console.error("Error fetching profile status:", error.message);
            // If error, we'll still let them in but log it. 
            // Better to fail-safe by letting them in if DB is down, 
            // otherwise we'd block everyone on DB error.
          } else if (profile && profile.status === false) {
            console.warn("User is blocked. Logging out...");
            await supabase.auth.signOut();
            setSession(null);
            localStorage.clear();
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    // 1. Initial Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        if (session) {
          checkStatus(session);
        } else {
          setLoading(false);
        }
      }
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        if (session) checkStatus(session);
        else setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return null; // Or a loading spinner

  // If no session, redirect to Home. If session exists, show the Dashboard.
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;