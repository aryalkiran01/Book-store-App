import { useEffect } from "react";
import { useMeQuery } from "../../api/auth/query";
import { useUserDetailsStore } from "../../store/useUsersDetails";
import { Link } from "react-router-dom";
import { User as UserIcon } from "lucide-react";

export function User() {
  const { data, isLoading, isError } = useMeQuery();
  const { setUserDetails, clearUserDetails } = useUserDetailsStore();

  useEffect(() => {
    if (data?.data) {
      setUserDetails({
        id: data.data.id,
        email: data.data.email,
        role: data.data.role,
        username: data.data.username,
      });
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

  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-transparent transition cursor-pointer">
      <div className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow">
        {data.data.username ? data.data.username.charAt(0) : <UserIcon size={14} />}
      </div>
      <div className="text-left text-slate-900 dark:text-white leading-tight pr-1">
        <div className="font-semibold text-xs">{data.data.username}</div>
        {data.data.role === "admin" && (
          <span className="text-[10px] text-amber-600 dark:text-amber-300 uppercase tracking-wider font-bold">
            Admin
          </span>
        )}
      </div>
    </div>
  );
}
