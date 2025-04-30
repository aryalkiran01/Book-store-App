import { useEffect } from "react";
import { useMeQuery } from "../../api/auth/query";
import { useUserDetailsStore } from "../../store/useUsersDetails";

export const userData = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};

export function User() {
  const { data, isLoading, isError, error } = useMeQuery();
  const {setUserDetails} = useUserDetailsStore();

  useEffect(() => {
    if (data) {
      setUserDetails({
        id: data.data.id,
        email: data.data.email,
        role: data.data.role,
        username: data.data.username
      })
    }
  }, [])

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (isError) {
    return <div className="text-white">{error.message}</div>;
  }

  if (!data) {
    return <div>No data</div>;
  }

  

  return (
    <div className="flex items-center space-x-3">
      <img
        alt={data.data.username}
        src={userData.imageUrl}
        className="h-8 w-8 rounded-full"
      />
      <div className="text-white">
        <div className="font-medium">{data.data.username}</div>
       
      </div>
    </div>
  );
}
