import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useRegisterUserMutation } from "../../api/auth/query";
import { errorToast, successToast } from "../toaster";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { KitabGharLogo } from "../common/KitabGharLogo";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(25, "Username must be under 25 characters")
      .regex(/^[a-zA-Z0-9_ -]+$/, "Alphanumeric, dashes, and underscores only"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterSchemaType = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const registerUserMutation = useRegisterUserMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    mode: "onBlur",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(registerSchema),
  });

  const onSubmit: SubmitHandler<RegisterSchemaType> = async (data) => {
    try {
      await registerUserMutation.mutateAsync(
        {
          email: data.email,
          username: data.username,
          password: data.password,
        },
        {
          onSuccess(res) {
            successToast(res.message || "Account created successfully! Please sign in.");
            reset();
            navigate("/login");
          },
          onError(error: any) {
            errorToast(error?.response?.data?.message || error.message || "Registration failed");
          },
        }
      );
    } catch (error: any) {
      errorToast(error?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden animate-fade-in my-8 transition-colors duration-300">
      {/* Accent Glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600/10 blur-3xl pointer-events-none rounded-full"></div>

      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <Link to="/" className="inline-block group focus-ring rounded-2xl p-1">
          <KitabGharLogo
            variant="full"
            size="lg"
            className="h-12 w-auto mx-auto hover:scale-105 transition-transform"
            alt="Kitab Ghar"
          />
        </Link>
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-[11px] font-bold tracking-wide uppercase text-indigo-600 dark:text-indigo-400 mb-1">
            Your Literary Haven
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Create Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Join KitabGhar to review books, save wishlists, and buy online
          </p>
        </div>
      </div>


      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username Field */}
        <div>
          <label htmlFor="register-username" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="register-username"
              type="text"
              placeholder="bookworm123"
              {...register("username")}
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${
                errors.username ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
              } rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition`}
            />
          </div>
          {errors.username && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{errors.username.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="register-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${
                errors.email ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
              } rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="register-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              className={`w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border ${
                errors.password ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
              } rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="register-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirmPassword")}
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${
                errors.confirmPassword ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
              } rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition`}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={registerUserMutation.isPending}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
        >
          {registerUserMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
            </>
          ) : (
            <>
              Register Free Account <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4"
        >
          Sign In Here
        </Link>
      </div>
    </div>
  );
}
