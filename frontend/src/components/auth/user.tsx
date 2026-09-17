import { useEffect } from "react";
import { useMeQuery } from "../../api/auth/query";
import { useUserDetailsStore } from "../../store/useUsersDetails";
import { Link } from "react-router-dom";


export function User() {
  const { data, isLoading, isError } = useMeQuery();
  const { setUserDetails, clearUserDetails } = useUserDetailsStore();

  useEffect(() => {
    if (data?.data) {
      setUserDetails(data.data);
    } else if (isError) {
      clearUserDetails();
    }
  }, [data, isError, setUserDetails, clearUserDetails]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-200">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          to="/login"
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-xl transition shadow-sm"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-transparent transition hidden sm:inline-block"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const user = data.data;
  const nameToDisplay = user.displayName || user.username || "Account";

  return (
    <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-transparent transition cursor-pointer">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={nameToDisplay}
          className="w-7 h-7 rounded-full object-cover shadow"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow">
          {nameToDisplay.charAt(0)}
        </div>
      )}
      <div className="text-left text-slate-900 dark:text-white leading-tight pr-1 hidden sm:block">
        <div className="font-semibold text-xs truncate max-w-[100px]">{nameToDisplay}</div>
        {user.role === "admin" && (
          <span className="text-[10px] text-amber-600 dark:text-amber-300 uppercase tracking-wider font-bold">
            Admin
          </span>
        )}
      </div>
    </div>
  );
}

