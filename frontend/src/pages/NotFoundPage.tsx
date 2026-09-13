import { Link } from "react-router-dom";
import { BookX, Home, BookOpen } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <AppShell />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-700/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 shadow-xl dark:shadow-2xl dark:shadow-indigo-600/20 animate-fade-in">
          <BookX className="w-12 h-12" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 mb-3">
          404 - Chapter Not Found
        </span>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-4">
          This Page Has Vanished from the Shelf
        </h1>

        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-8">
          The page or book link you are looking for might have been moved, renamed, or does not exist in our library catalog.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/books"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> Browse Catalog
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default NotFoundPage;
