import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useLoginUserMutation } from "../../api/auth/query";
import { successToast, errorToast } from "../toaster";


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(25),
});

export function LoginForm() {
  const navigate = useNavigate();
  const loginUserMutation = useLoginUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<z.infer<typeof loginSchema>> = (data) => {
    try {
      loginUserMutation.mutateAsync(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess(data) {
            successToast(data.message);
            reset();
            navigate("/");
          },
          onError(error) {
            console.error("error", error);
            errorToast(error.message);
          },
        }
      );
    } catch (error) {
      console.error("error", error);
      errorToast("something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br  to-indigo-900 p-4">
     <form
  onSubmit={handleSubmit(onSubmit)}
  className="w-full max-w-lg space-y-10 rounded-2xl bg-white p-10 shadow-2xl"
>
  <h2 className="text-3xl font-bold leading-tight text-center text-gray-800">
    Login
  </h2>
  <p className="text-base text-center text-gray-500">
    Login with your existing account
  </p>

  <div className="space-y-8">
    <div>
      <label htmlFor="email" className="block text-base font-medium text-gray-700">
        Email
      </label>
      <input
        id="email"
        type="email"
        placeholder="Enter your email"
        className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-gray-900 text-base shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-300"
        {...register("email")}
      />
      {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
    </div>

    <div>
      <label htmlFor="password" className="block text-base font-medium text-gray-700">
        Password
      </label>
      <input
        id="password"
        type="password"
        placeholder="Enter your password"
        className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-gray-900 text-base shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-300"
        {...register("password")}
      />
      {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
    </div>
  </div>

  <div className="mt-8 flex items-center justify-between">
    <p className="text-base text-gray-600">
      Don’t have an account?{" "}
      <Link className="text-indigo-600 underline" to="/register">
        Register
      </Link>
    </p>
    <button
      type="submit"
      className="inline-flex items-center rounded-lg bg-indigo-600 px- py-3 text-base font-medium text-white shadow-md  hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
      disabled={loginUserMutation.isPending}
    >
      {loginUserMutation.isPending ? "Logging in..." : "Login"}
    </button>
  </div>
</form>

    </div>
  );
}

export default LoginForm;