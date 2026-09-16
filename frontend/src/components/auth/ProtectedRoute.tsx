import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserDetailsStore } from "../../store/useUsersDetails";
import { me } from "../../api/auth/fetch";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, setUserDetails, clearUserDetails } = useUserDetailsStore();
  const [checking, setChecking] = useState(!isAuthenticated);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      me()
        .then((res) => {
          if (isMounted && res.isSuccess && res.data) {
            setUserDetails(res.data);
          }
        })
        .catch(() => {
          if (isMounted) {
            clearUserDetails();
          }
        })
        .finally(() => {
          if (isMounted) {
            setChecking(false);
          }
        });
    } else {
      setChecking(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, setUserDetails, clearUserDetails]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Verifying credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  return <>{children}</>;
};
