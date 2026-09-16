import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserDetailsStore } from "../../store/useUsersDetails";
import { me } from "../../api/auth/fetch";
import { Loader2, ShieldAlert } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, isAdmin, setUserDetails, clearUserDetails } = useUserDetailsStore();
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
          Verifying administrative permissions...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Forbidden</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You do not have administrative privileges to access this area.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
        >
          Return to Homepage
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
