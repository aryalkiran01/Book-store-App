import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  User,
  LayoutDashboard,
  ShoppingBag,
  Heart,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "../AppShell";
import { Footer } from "../../pages/Footer";
import { useUserDetailsStore } from "../../store/useUsersDetails";
import { useMeQuery } from "../../api/auth/query";

interface AccountLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AccountLayout({ children, title, subtitle }: AccountLayoutProps) {
  const location = useLocation();
  const { userDetails } = useUserDetailsStore();
  const { data } = useMeQuery();

  const user = data?.data || userDetails;

  const displayName =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Reader";

  const username = user.username || "user";
  const email = user.email || "";
  const isEmailVerified = Boolean(user.isEmailVerified);
  const completion = user.completion?.percentage ?? 75;

  const navItems = [
    {
      name: "Account Overview",
      href: "/account",
      aliases: ["/account", "/account/overview"],
      icon: LayoutDashboard,
      description: "Summary & activity",
    },
    {
      name: "Personal Profile",
      href: "/profile",
      aliases: ["/profile", "/account/profile", "/my-profile"],
      icon: User,
      description: "Manage your info & avatar",
    },
    {
      name: "My Orders",
      href: "/orders",
      aliases: ["/orders", "/my-orders"],
      icon: ShoppingBag,
      description: "Track & view invoices",
      badge: user.statistics?.orders ? String(user.statistics.orders) : undefined,
    },
    {
      name: "Wishlist",
      href: "/wishlist",
      aliases: ["/wishlist"],
      icon: Heart,
      description: "Saved books for later",
      badge: user.statistics?.wishlist ? String(user.statistics.wishlist) : undefined,
    },
    {
      name: "Security & Login",
      href: "/account/security",
      aliases: ["/account/security"],
      icon: ShieldCheck,
      description: "Password & session controls",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <AppShell />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Account Header Banner */}
        <div className="mb-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative group">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={displayName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-black ring-4 ring-white/20 shadow-xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                {isEmailVerified && (
                  <div
                    className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-indigo-900 shadow"
                    title="Verified Account"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {displayName}
                  </h1>
                  {user.role === "admin" && (
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-indigo-200 mt-0.5">
                  @{username} &bull; {email}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full ${
                      isEmailVerified
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {isEmailVerified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Email Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Email Unverified
                      </>
                    )}
                  </span>
                  {user.location?.city && (
                    <span className="text-indigo-200 hidden sm:inline-flex items-center gap-1">
                      📍 {user.location.city}, {user.location.country || "Nepal"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Completion Widget */}
            <div className="w-full md:w-64 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-indigo-100">Profile Completion</span>
                <span className="font-bold text-amber-300">{completion}%</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                ></div>
              </div>
              {completion < 100 && (
                <Link
                  to="/profile"
                  className="mt-2 text-[11px] text-amber-200 hover:text-white font-medium flex items-center justify-between group"
                >
                  <span>Complete your missing details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm sticky top-24">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                My Account
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.aliases.includes(location.pathname);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl transition group ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/80 shadow-sm"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl transition ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-semibold truncate leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                            {item.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.badge && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-800 dark:group-hover:bg-indigo-900/60 dark:group-hover:text-indigo-300">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isActive
                              ? "text-indigo-600 dark:text-indigo-400 translate-x-0.5"
                              : "text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5"
                          }`}
                        />
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Area */}
          <div className="lg:col-span-3 space-y-6">
            {(title || subtitle) && (
              <div className="mb-2">
                {title && (
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
