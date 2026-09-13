import { useLogoutMutation } from "../../api/auth/query";
import { useUserDetailsStore } from "../../store/useUsersDetails";
import { useQueryClient } from "@tanstack/react-query";
import { errorToast, successToast } from "../toaster";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export function Logout() {
  const logoutMutation = useLogoutMutation();
  const { clearUserDetails } = useUserDetailsStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync(
        {},
        {
          onSuccess: () => {
            clearUserDetails();
            queryClient.setQueryData(["me"], null);
            queryClient.invalidateQueries({ queryKey: ["me"] });
            successToast("Logged out successfully");
            navigate("/");
          },
          onError: (error) => {
            console.error(error);
            clearUserDetails();
            errorToast(error.message || "Logout error");
            navigate("/");
          },
        }
      );
    } catch (error: any) {
      console.error(error);
      clearUserDetails();
      navigate("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
    >
      <LogOut size={16} />
      <span>{logoutMutation.isPending ? "Logging out..." : "Log Out"}</span>
    </button>
  );
}

