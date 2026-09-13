import { useState, useEffect } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";
import { User } from "./auth/user";
import { Link, useLocation } from "react-router-dom";
import { Logout } from "./auth/logout";
import { IoBookSharp } from "react-icons/io5";
import SearchBar from "./searchbar";
import { FaOpencart } from "react-icons/fa6";
import { Heart, Compass, BookOpen, LayoutDashboard, ShoppingBag } from "lucide-react";
import { getCart, getWishlist } from "../utils/cartStorage";

export function AppShell() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const syncCounts = () => {
      setCartCount(getCart().reduce((sum, item) => sum + item.quantity, 0));
      setWishlistCount(getWishlist().length);
    };

    syncCounts();

    window.addEventListener("storage", syncCounts);
    window.addEventListener("cart-wishlist-update", syncCounts);
    return () => {
      window.removeEventListener("storage", syncCounts);
      window.removeEventListener("cart-wishlist-update", syncCounts);
    };
  }, []);

  const navLinks = [
    { name: "Explore", href: "/", icon: Compass },
    { name: "Catalog", href: "/books", icon: BookOpen },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <div className="bg-slate-950">
      <nav className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-2.5 flex-shrink-0 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <IoBookSharp className="text-xl text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white hidden sm:inline-block">
                Kitab<span className="text-indigo-400">Ghar</span>
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
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
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
            <div className="hidden sm:flex items-center space-x-3">
              {/* Wishlist Icon */}
              <Link
                to="/wishlist"
                className="relative p-2.5 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-slate-800/80 transition"
                title="Wishlist"
              >
                <Heart size={19} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-slate-900 shadow">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Icon */}
              <Link
                to="/cart"
                className="relative p-2.5 rounded-xl text-slate-300 hover:text-indigo-400 hover:bg-slate-800/80 transition"
                title="Shopping Cart"
              >
                <FaOpencart className="text-xl" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-slate-900 shadow">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown */}
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center rounded-full bg-slate-800 text-sm text-white focus:ring-2 focus:ring-indigo-500">
                  <User />
                </MenuButton>
                <MenuItems className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 divide-y divide-slate-800">
                  <div className="p-1 space-y-0.5">
                    <Link
                      to="/orders"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                      <ShoppingBag size={14} className="text-indigo-400" /> My Orders
                    </Link>
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                      <Heart size={14} className="text-rose-400" /> My Wishlist
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

            {/* Mobile menu toggle */}
            <div className="flex sm:hidden items-center space-x-2">
              <Link
                to="/cart"
                className="relative p-2 text-slate-300 hover:text-white"
              >
                <FaOpencart className="text-xl" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 p-2 rounded-xl hover:bg-slate-800"
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
          <div className="sm:hidden bg-slate-900 border-b border-slate-800 px-4 py-6 space-y-4">
            <SearchBar />

            <div className="space-y-1 pt-2">
              {navLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  {item.name}
                </Link>
              ))}

              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <Heart size={16} className="text-rose-400" /> Wishlist
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
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <FaOpencart className="text-indigo-400" /> Cart
                </span>
                {cartCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-center">
              <Logout />
            </div>
          </div>
        )}
      </nav>

      <Toaster position="top-right" />
    </div>
  );
}
