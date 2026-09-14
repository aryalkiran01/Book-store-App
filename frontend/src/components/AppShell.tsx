import { useState, useEffect, useRef } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";
import { User } from "./auth/user";
import { Link, useLocation } from "react-router-dom";
import { Logout } from "./auth/logout";
import { IoBookSharp } from "react-icons/io5";
import SearchBar from "./searchbar";
import { FaOpencart } from "react-icons/fa6";
import { Heart, Compass, BookOpen, ShoppingBag, ShieldCheck } from "lucide-react";
import { getCart, getWishlist } from "../utils/cartStorage";
import { useUserDetailsStore } from "../store/useUsersDetails";
import { ThemeToggle } from "./common/ThemeToggle";

export function AppShell() {
  const location = useLocation();
  const { isAdmin } = useUserDetailsStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartBump, setCartBump] = useState(false);
  const [wishlistBump, setWishlistBump] = useState(false);
  const prevCartCount = useRef(0);
  const prevWishlistCount = useRef(0);

  useEffect(() => {
    const syncCounts = () => {
      const currentCart = getCart().reduce((sum, item) => sum + item.quantity, 0);
      const currentWishlist = getWishlist().length;

      if (currentCart !== prevCartCount.current) {
        setCartBump(true);
        const timer = setTimeout(() => setCartBump(false), 300);
        prevCartCount.current = currentCart;
        setCartCount(currentCart);
        return () => clearTimeout(timer);
      } else {
        setCartCount(currentCart);
      }

      if (currentWishlist !== prevWishlistCount.current) {
        setWishlistBump(true);
        const timer = setTimeout(() => setWishlistBump(false), 300);
        prevWishlistCount.current = currentWishlist;
        setWishlistCount(currentWishlist);
        return () => clearTimeout(timer);
      } else {
        setWishlistCount(currentWishlist);
      }
    };

    syncCounts();

    window.addEventListener("storage", syncCounts);
    window.addEventListener("cart-wishlist-update", syncCounts);
    return () => {
      window.removeEventListener("storage", syncCounts);
      window.removeEventListener("cart-wishlist-update", syncCounts);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Explore", href: "/", icon: Compass },
    { name: "Catalog", href: "/books", icon: BookOpen },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    ...(isAdmin
      ? [{ name: "Admin Panel", href: "/admin", icon: ShieldCheck, badge: "Admin" }]
      : []),
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-150">
      {/* Accessibility: Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-2xl focus-ring"
      >
        Skip to main content
      </a>

      <nav
        role="navigation"
        aria-label="Main Navigation"
        className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md sticky top-0 z-40 transition-colors duration-150 shadow-sm dark:shadow-none"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0 group focus-ring rounded-xl p-1"
              aria-label="KitabGhar Homepage"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
                <IoBookSharp className="text-lg sm:text-xl text-white" />
              </div>
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Kitab<span className="text-indigo-600 dark:text-indigo-400">Ghar</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 focus-ring ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={14} />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Search Bar */}
            <div className="hidden lg:block flex-1 max-w-md mx-2">
              <SearchBar />
            </div>

            {/* Actions & Profile */}
            <div className="hidden sm:flex items-center space-x-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Wishlist Icon */}
              <Link
                to="/wishlist"
                className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition focus-ring btn-press"
                title="Wishlist"
                aria-label={`View Wishlist (${wishlistCount} items)`}
              >
                <Heart size={19} />
                {wishlistCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-slate-900 shadow ${
                      wishlistBump ? "animate-badge-bump" : ""
                    }`}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Icon */}
              <Link
                to="/cart"
                className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition focus-ring btn-press"
                title="Shopping Cart"
                aria-label={`View Shopping Cart (${cartCount} items)`}
              >
                <FaOpencart className="text-xl" />
                {cartCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-slate-900 shadow ${
                      cartBump ? "animate-badge-bump" : ""
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown */}
              <Menu as="div" className="relative">
                <MenuButton
                  className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus-ring"
                  aria-label="User Account Menu"
                >
                  <User />
                </MenuButton>
                <MenuItems className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-scale-in">
                  <div className="p-1 space-y-0.5">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-xl transition border border-indigo-200 dark:border-indigo-800/60 mb-1 focus-ring"
                      >
                        <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" /> Admin Control Center
                      </Link>
                    )}
                    <Link
                      to="/orders"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition focus-ring"
                    >
                      <ShoppingBag size={14} className="text-indigo-600 dark:text-indigo-400" /> My Orders
                    </Link>
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition focus-ring"
                    >
                      <Heart size={14} className="text-rose-500 dark:text-rose-400" /> My Wishlist
                    </Link>
                  </div>
                  <MenuItem>
                    <div className="p-1">
                      <Logout />
                    </div>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>

            {/* Mobile Actions: Wishlist, Cart & Menu Hamburger */}
            <div className="flex sm:hidden items-center space-x-1">
              <ThemeToggle />

              <Link
                to="/wishlist"
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-rose-500 focus-ring rounded-lg btn-press"
                aria-label={`View Wishlist (${wishlistCount} items)`}
              >
                <Heart size={18} />
                {wishlistCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black px-1.2 py-0.2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                      wishlistBump ? "animate-badge-bump" : ""
                    }`}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                to="/cart"
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 focus-ring rounded-lg btn-press"
                aria-label={`View Shopping Cart (${cartCount} items)`}
              >
                <FaOpencart className="text-lg" />
                {cartCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-black px-1.2 py-0.2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                      cartBump ? "animate-badge-bump" : ""
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 dark:text-slate-300 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring btn-press"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-5 space-y-4 animate-fade-in shadow-xl">
            <SearchBar />

            <div className="space-y-1 pt-1">
              {navLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring"
                >
                  {item.name}
                </Link>
              ))}

              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring"
              >
                <span className="flex items-center gap-2">
                  <Heart size={16} className="text-rose-500 dark:text-rose-400" /> Wishlist
                </span>
                {wishlistCount > 0 && (
                  <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring"
              >
                <span className="flex items-center gap-2">
                  <FaOpencart className="text-indigo-600 dark:text-indigo-400" /> Cart
                </span>
                {cartCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Logout />
            </div>
          </div>
        )}
      </nav>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          className: "dark:bg-slate-900 dark:text-white dark:border dark:border-slate-800 font-sans shadow-xl rounded-2xl",
        }}
      />
    </div>
  );
}
