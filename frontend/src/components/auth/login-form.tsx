import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useLoginUserMutation } from "../../api/auth/query";
import { successToast, errorToast } from "../toaster";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { IoBookSharp } from "react-icons/io5";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginUserMutation = useLoginUserMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginSchemaType> = async (data) => {
    try {
      await loginUserMutation.mutateAsync(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess(res) {
            successToast(res.message || "Logged in successfully!");
            queryClient.invalidateQueries({ queryKey: ["me"] });
            reset();
            navigate("/");
          },
          onError(error: any) {
            errorToast(error?.response?.data?.message || error.message || "Invalid credentials");
          },
        }
      );
    } catch (error: any) {
      errorToast(error?.response?.data?.message || "Failed to log in");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden animate-fade-in my-8">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl pointer-events-none rounded-full"></div>

      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30 text-white">
          <IoBookSharp className="text-2xl" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Welcome Back
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Sign in to access your reading list, orders, and reviews
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              className={`w-full pl-10 pr-4 py-3 bg-slate-950 border ${
                errors.email ? "border-rose-500" : "border-slate-800"
              } rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              className={`w-full pl-10 pr-10 py-3 bg-slate-950 border ${
                errors.password ? "border-rose-500" : "border-slate-800"
              } rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loginUserMutation.isPending}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
        >
          {loginUserMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
            </>
          ) : (
            <>
              Sign In to KitabGhar <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        Don't have an account yet?{" "}
        <Link
          to="/register"
          className="font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
        >
          Create a Free Account
        </Link>
      </div>
    </div>
  );
}