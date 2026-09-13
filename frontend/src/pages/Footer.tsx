import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Mail,
  Send,
  CheckCircle2,
} from "lucide-react";
import { FaFacebookF, FaTwitter, FaInstagram, FaGithub } from "react-icons/fa";
import { IoBookSharp } from "react-icons/io5";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900 mt-auto">
      {/* Value Proposition Highlights Bar */}
      <div className="border-b border-slate-900/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-950/70 border border-indigo-800/80 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Express Delivery</h4>
                <p className="text-xs text-slate-400">Fast nationwide courier</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Verified Reviews</h4>
                <p className="text-xs text-slate-400">100% authentic reader ratings</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-950/70 border border-purple-800/80 flex items-center justify-center text-purple-400 flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Safe Cancellation</h4>
                <p className="text-xs text-slate-400">Instant inventory restore</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-950/70 border border-amber-800/80 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">24/7 Reader Support</h4>
                <p className="text-xs text-slate-400">Dedicated assistance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <IoBookSharp className="text-xl text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Kitab<span className="text-indigo-400">Ghar</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Nepal's premier book community and bookstore platform. Explore thousands of bestselling books, share genuine reviews, and support avid reading cultures.
            </p>

            {/* Newsletter Subscription */}
            <div className="pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Subscribe for Book Deals & Updates
              </h5>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" /> Subscribe
                </button>
              </form>
              {subscribed && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Thank you for subscribing to KitabGhar!
                </p>
              )}
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">
              Explore Store
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/books" className="hover:text-indigo-400 transition-colors">
                  All Catalog Books
                </Link>
              </li>
              <li>
                <Link to="/books?genre=Fiction" className="hover:text-indigo-400 transition-colors">
                  Fiction & Novels
                </Link>
              </li>
              <li>
                <Link to="/books?genre=Business%20%26%20Investing" className="hover:text-indigo-400 transition-colors">
                  Business & Finance
                </Link>
              </li>
              <li>
                <Link to="/books?genre=Self-Help" className="hover:text-indigo-400 transition-colors">
                  Self-Help & Productivity
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="hover:text-indigo-400 transition-colors">
                  My Reading Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support & Orders */}
          <div>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">
              Account & Help
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/orders" className="hover:text-indigo-400 transition-colors">
                  Track My Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-indigo-400 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-indigo-400 transition-colors">
                  Reader Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-indigo-400 transition-colors">
                  Create Free Account
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-indigo-400 transition-colors">
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">
              Get in Touch
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <p>Kathmandu, Bagmati, Nepal</p>
              <p>Email: aryalkiran21@gmail.com</p>
              <p>Phone: +977 98-275-142-82</p>
              <p className="text-slate-500">Available Sun - Fri, 9am - 7pm</p>

              {/* Social Media Links */}
              <div className="flex gap-3 pt-2">
                <a
                  href="https://github.com/aryalkiran01/Book-store-App"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <FaGithub className="text-sm" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
                >
                  <FaTwitter className="text-sm" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-pink-400 transition-colors"
                >
                  <FaInstagram className="text-sm" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <FaFacebookF className="text-sm" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Security */}
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} KitabGhar Book Store. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Secure 256-Bit SSL Encrypted</span>
            <span>Khalti ePayment Supported</span>
            <span>Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}