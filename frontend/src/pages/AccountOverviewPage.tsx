import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Heart,
  Star,
  BookOpen,
  User,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Compass,
} from "lucide-react";

import { AccountLayout } from "../components/account/AccountLayout";
import { useUserDetailsStore } from "../store/useUsersDetails";
import { useMeQuery } from "../api/auth/query";

export function AccountOverviewPage() {
  const { userDetails } = useUserDetailsStore();
  const { data } = useMeQuery();

  const user = data?.data || userDetails;

  const displayName =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Reader";

  const completion = user.completion || {
    percentage: 75,
    completedCount: 5,
    totalCount: 7,
    steps: [],
  };

  useEffect(() => {
    document.title = "Account Overview | KitabGhar";
  }, []);

  return (
    <AccountLayout
      title={`Welcome back, ${displayName} 👋`}
      subtitle="Here is an overview of your bookstore account activity, profile status, and quick shortcuts."
    >
      <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/orders"
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Orders
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.orders ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 group-hover:text-indigo-600">
              View orders <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          <Link
            to="/wishlist"
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-400 dark:hover:border-rose-600 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Wishlist
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.wishlist ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 group-hover:text-rose-500">
              View wishlist <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reviews
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.reviews ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Book feedback shared
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Books Bought
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.booksPurchased ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Total reading volume
            </span>
          </div>
        </div>

        {/* Profile Completion Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Profile Setup Progress
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete all profile checklist items to unlock the best recommendations and faster checkout.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                {completion.percentage}%
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                {completion.completedCount} of {completion.totalCount} completed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {completion.steps.map((step) => (
              <div
                key={step.key}
                className={`p-3.5 rounded-2xl flex items-center gap-3 border transition ${
                  step.completed
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400"
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
            ))}
          </div>

          {completion.percentage < 100 && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition"
              >
                <User className="w-3.5 h-3.5" /> Complete Profile Details
              </Link>
            </div>
          )}
        </div>

        {/* Quick Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/profile"
            className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform mb-3">
              <User className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Edit Profile & Photo
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Change your username, display name, avatar, and phone number.
            </p>
          </Link>

          <Link
            to="/account/security"
            className="p-5 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-100 dark:border-purple-900/50 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Security & Credentials
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update your password, request email changes, and manage sessions.
            </p>
          </Link>

          <Link
            to="/books"
            className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/40 dark:to-rose-950/40 border border-amber-100 dark:border-amber-900/50 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Browse Bookstore
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Discover new releases, bestsellers, and curated reading lists.
            </p>
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}
