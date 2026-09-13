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
      <div className="flex items-center space-x-2 px-3 py-1.5 text-xs text-indigo-100">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          to="/login"
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg transition hidden sm:inline-block"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer">
      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow">
        {data.data.username ? data.data.username.charAt(0) : <UserIcon size={14} />}
      </div>
      <div className="text-left text-white leading-tight pr-1">
        <div className="font-semibold text-xs">{data.data.username}</div>
        {data.data.role === "admin" && (
          <span className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">
            Admin
          </span>
        )}
      </div>
    </div>
  );
}

