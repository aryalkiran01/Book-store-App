/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Boxes,
  ShoppingBag,
  Users,
  MessageSquare,
  Tags,
  Plus,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Package,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Clock,
  X,
  AlertCircle,
  Save,
  Star,
  BookMarked,
  Globe,
  Download,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { AppImage } from "../components/common/AppImage";
import { useUserDetailsStore } from "../store/useUsersDetails";
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminUserRole,
  deleteAdminUser,
  fetchAdminInventory,
  quickUpdateStock,
  fetchAdminCategories,
  fetchAdminAuthors,
  fetchAdminReviews,
  moderateAdminReview,
  deleteAdminReview,
  fetchAdminOrders,
  searchOpenLibraryBooks,
  importOpenLibraryBook,
  OpenLibraryBook,
  AdminStatsData,
  AdminUser,
} from "../api/admin/fetch";
import {
  getAllBooks,
  addBook,
  updateBook,
  deleteBook,
  TBook,
} from "../api/book/fetch";
import { updateOrderStatus } from "../api/order/fetch";

type TabKey =
  | "overview"
  | "books"
  | "inventory"
  | "orders"
  | "users"
  | "reviews"
  | "categories";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, userDetails } = useUserDetailsStore();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Overview state
  const [stats, setStats] = useState<AdminStatsData | null>(null);

  // 2. Books state
  const [books, setBooks] = useState<TBook[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [bookGenre, setBookGenre] = useState("all");
  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<TBook | null>(null);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    genre: "Fiction",
    price: 500,
    discountPercentage: 0,
    stock: 20,
    description: "",
    image: "",
    featured: false,
    isNewArrival: true,
  });
  const [savingBook, setSavingBook] = useState(false);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // 3. Inventory state
  const [inventory, setInventory] = useState<any[]>([]);
  const [invSummary, setInvSummary] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [invFilter, setInvFilter] = useState("all");
  const [invSearch, setInvSearch] = useState("");
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // 4. Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [newOrderStatus, setNewOrderStatus] = useState("");
  const [orderStatusNote, setOrderStatusNote] = useState("");

  // 5. Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // 6. Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [flaggedReviewsCount, setFlaggedReviewsCount] = useState(0);

  // 7. Categories & Authors state
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Open Library Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [olQuery, setOlQuery] = useState("");
  const [olResults, setOlResults] = useState<OpenLibraryBook[]>([]);
  const [olSearching, setOlSearching] = useState(false);
  const [importingBookId, setImportingBookId] = useState<string | null>(null);
  const [importSettings, setImportSettings] = useState<
    Record<string, { price: number; stock: number; genre: string }>
  >({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSearchOpenLibrary = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : olQuery).trim();
    if (!query) return;
    try {
      setOlSearching(true);
      if (customQuery !== undefined) setOlQuery(customQuery);
      const res = await searchOpenLibraryBooks(query, 1, 16);
      setOlResults(res.data || []);
      const initialSettings: Record<
        string,
        { price: number; stock: number; genre: string }
      > = {};
      (res.data || []).forEach((b) => {
        initialSettings[b.openLibraryId] = {
          price: b.suggestedPriceNPR || 799,
          stock: 25,
          genre: b.genre || "Fiction",
        };
      });
      setImportSettings(initialSettings);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || "Failed to search Open Library");
    } finally {
      setOlSearching(false);
    }
  };

  const handleImportBook = async (b: OpenLibraryBook) => {
    try {
      setImportingBookId(b.openLibraryId);
      const setting = importSettings[b.openLibraryId] || {
        price: b.suggestedPriceNPR || 799,
        stock: 25,
        genre: b.genre || "Fiction",
      };

      const res = await importOpenLibraryBook({
        title: b.title,
        author: b.author,
        genre: setting.genre || b.genre || "Fiction",
        price: Number(setting.price) || b.suggestedPriceNPR || 799,
        stock: Number(setting.stock) || 25,
        isbn: b.isbn || "",
        openLibraryId: b.openLibraryId || "",
        coverId: b.coverId || "",
        image: b.coverUrl || "",
        publisher: b.publisher || "",
        publicationDate: b.firstPublishYear ? String(b.firstPublishYear) : "",
        pages: b.pages || 0,
        language: b.language || "English",
        description: `Acclaimed literary edition by ${b.author}. Published by ${b.publisher || "leading publishers"}${b.firstPublishYear ? ` in ${b.firstPublishYear}` : ""}.`,
        discountPercentage: 0,
        featured: false,
        isNewArrival: true,
      });

      showToast(res.message || `Successfully imported "${b.title}" into catalog!`);
      // Update local card state to reflect imported
      setOlResults((prev) =>
        prev.map((item) =>
          item.openLibraryId === b.openLibraryId
            ? { ...item, isAlreadyImported: true }
            : item
        )
      );
      loadTabData("books");
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || "Failed to import book");
    } finally {
      setImportingBookId(null);
    }
  };

  // Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Load initial tab data
  useEffect(() => {
    if (!isAdmin) return;
    loadTabData(activeTab);
  }, [
    activeTab,
    isAdmin,
    bookSearch,
    bookGenre,
    bookPage,
    invFilter,
    invSearch,
    orderStatusFilter,
    orderPage,
    userSearch,
    userRoleFilter,
    userPage,
    reviewStatusFilter,
  ]);

  const loadTabData = async (tab: TabKey) => {
    try {
      setLoading(true);
      if (tab === "overview") {
        const data = await fetchAdminStats();
        setStats(data);
      } else if (tab === "books") {
        const res = await getAllBooks({
          page: bookPage,
          limit: 10,
          search: bookSearch,
          genre: bookGenre,
        });
        setBooks(res.data);
        setBookTotalPages(res.pagination?.totalPages || 1);
      } else if (tab === "inventory") {
        const res = await fetchAdminInventory({
          stockFilter: invFilter,
          search: invSearch,
        });
        setInventory(res.data);
        setInvSummary(res.summary);
      } else if (tab === "orders") {
        const res = await fetchAdminOrders({
          page: orderPage,
          limit: 10,
          status: orderStatusFilter,
        });
        setOrders(res.data);
        setOrderTotalPages(res.pagination.totalPages || 1);
      } else if (tab === "users") {
        const res = await fetchAdminUsers({
          page: userPage,
          limit: 10,
          search: userSearch,
          role: userRoleFilter,
        });
        setUsers(res.data);
        setUserTotalPages(res.pagination.totalPages || 1);
      } else if (tab === "reviews") {
        const res = await fetchAdminReviews({
          status: reviewStatusFilter,
        });
        setReviews(res.data);
        setFlaggedReviewsCount(res.flaggedCount || 0);
      } else if (tab === "categories") {
        const [catData, authData] = await Promise.all([
          fetchAdminCategories(),
          fetchAdminAuthors(),
        ]);
        setCategories(catData);
        setAuthors(authData);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Error loading tab data");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- BOOK ACTIONS ----------------
  const openAddBookModal = () => {
    setEditingBook(null);
    setBookForm({
      title: "",
      author: "",
      isbn: "",
      genre: "Fiction",
      price: 500,
      discountPercentage: 0,
      stock: 20,
      description: "",
      image: "",
      featured: false,
      isNewArrival: true,
    });
    setBookModalOpen(true);
  };

  const openEditBookModal = (book: TBook) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      genre: book.genre || "Fiction",
      price: book.price || 0,
      discountPercentage: book.discountPercentage || 0,
      stock: book.stock ?? 20,
      description: book.description || "",
      image: book.image || "",
      featured: Boolean(book.featured),
      isNewArrival: Boolean(book.isNewArrival),
    });
    setBookModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author || !bookForm.price) {
      showToast("Please fill in title, author, and price.");
      return;
    }
    try {
      setSavingBook(true);
      if (editingBook) {
        await updateBook({ bookId: editingBook._id, ...bookForm });
        showToast("Book updated successfully!");
      } else {
        await addBook(bookForm);
        showToast("New book created successfully!");
      }
      setBookModalOpen(false);
      loadTabData("books");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to save book.");
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = (bookId: string, title: string) => {
    setConfirmModal({
      title: "Delete Book",
      message: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          setDeletingBookId(bookId);
          await deleteBook({ bookId });
          showToast(`Deleted book "${title}".`);
          setConfirmModal(null);
          loadTabData("books");
        } catch (err: any) {
          showToast(err?.response?.data?.message || "Failed to delete book.");
        } finally {
          setDeletingBookId(null);
        }
      },
    });
  };

  // ---------------- INVENTORY ACTIONS ----------------
  const handleQuickStockUpdate = async (bookId: string, newStock: number) => {
    try {
      setUpdatingStockId(bookId);
      await quickUpdateStock(bookId, newStock);
      showToast("Stock quantity updated.");
      setInventory((prev) =>
        prev.map((item) =>
          item._id === bookId ? { ...item, stock: newStock } : item
        )
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update stock");
    } finally {
      setUpdatingStockId(null);
    }
  };

  // ---------------- ORDER ACTIONS ----------------
  const handleOpenStatusModal = (order: any) => {
    setSelectedOrder(order);
    setNewOrderStatus(order.status);
    setOrderStatusNote("");
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    try {
      setUpdatingOrderStatus(true);
      await updateOrderStatus(
        selectedOrder._id,
        newOrderStatus,
        orderStatusNote
      );
      showToast(`Order status updated to ${newOrderStatus}.`);
      setSelectedOrder(null);
      loadTabData("orders");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // ---------------- USER ACTIONS ----------------
  const handleToggleUserRole = async (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setConfirmModal({
      title: `Change User Role`,
      message: `Are you sure you want to change ${user.username}'s role to ${newRole}?`,
      onConfirm: async () => {
        try {
          await updateAdminUserRole(user._id, newRole);
          showToast(`User role updated to ${newRole}`);
          setConfirmModal(null);
          loadTabData("users");
        } catch (err: any) {
          showToast(err?.response?.data?.message || "Failed to update role");
        }
      },
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    if (user._id === userDetails.id) {
      showToast("You cannot delete your own admin account.");
      return;
    }
    setConfirmModal({
      title: "Delete User",
      message: `Permanently delete ${user.username} (${user.email})?`,
      onConfirm: async () => {
        try {
          setDeletingUserId(user._id);
          await deleteAdminUser(user._id);
          showToast(`User ${user.username} deleted.`);
          setConfirmModal(null);
          loadTabData("users");
        } catch (err: any) {
          showToast(err?.response?.data?.message || "Failed to delete user");
        } finally {
          setDeletingUserId(null);
        }
      },
    });
  };

  // ---------------- REVIEW ACTIONS ----------------
  const handleModerateReview = async (
    reviewId: string,
    status: "published" | "hidden"
  ) => {
    try {
      await moderateAdminReview(reviewId, status);
      showToast(`Review status set to ${status}.`);
      loadTabData("reviews");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to moderate review");
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    setConfirmModal({
      title: "Delete Review",
      message: "Permanently remove this customer review?",
      onConfirm: async () => {
        try {
          await deleteAdminReview(reviewId);
          showToast("Review deleted.");
          setConfirmModal(null);
          loadTabData("reviews");
        } catch (err: any) {
          showToast(err?.response?.data?.message || "Failed to delete review");
        }
      },
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
        <AppShell />
        <main className="flex-1 max-w-xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500 mb-6 shadow-xl">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3">
            Administrator Access Required
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            You must be logged into an authorized Administrator account to
            access the Book Store Control Center.
          </p>
          <div className="flex gap-4">
            <Link
              to="/books"
              className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors border border-slate-200 dark:border-slate-700"
            >
              Back to Catalog
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-lg shadow-indigo-600/30"
            >
              Sign In with Admin
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppShell />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-slate-900 border border-indigo-500 text-slate-900 dark:text-white px-5 py-3.5 rounded-xl shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-colors"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title & Admin Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin Control Center
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Logged in as {userDetails.username}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Store & Catalog Management
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadTabData(activeTab)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors shadow-sm"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`}
              />
              Refresh Data
            </button>
            <button
              onClick={openAddBookModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Book
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200 dark:border-slate-800/80 scrollbar-thin">
          {[
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "books", label: "Books Catalog", icon: BookOpen },
            { key: "inventory", label: "Inventory", icon: Boxes },
            { key: "orders", label: "Orders", icon: ShoppingBag },
            { key: "users", label: "Users & Roles", icon: Users },
            { key: "reviews", label: "Review Moderation", icon: MessageSquare },
            { key: "categories", label: "Genres & Authors", icon: Tags },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.key === "reviews" && flaggedReviewsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {flaggedReviewsCount}
                  </span>
                )}
                {tab.key === "inventory" && invSummary.lowStockCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                    {invSummary.lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ---------------- TAB CONTENT ---------------- */}
        {loading && !stats && !books.length && !orders.length && (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Loading dashboard metrics...
            </p>
          </div>
        )}

        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === "overview" && stats && (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Revenue
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                  NPR {stats.metrics.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> Authoritative sales
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Orders
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                  {stats.metrics.totalOrders}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {stats.metrics.pendingOrders}{" "}
                  pending orders
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Catalog Titles
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                  {stats.metrics.totalBooks}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Across{" "}
                  {stats.topCategories?.length || 0} genres
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Reader Community
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/80 border border-pink-200 dark:border-pink-800/80 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                  {stats.metrics.totalUsers}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {stats.recentReviews?.length || 0} verified reviews posted
                </div>
              </div>
            </div>

            {/* Inventory Alerts Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">
                      Low Stock Inventory Alert
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-200/80">
                      {stats.metrics.lowStockBooksCount || 0} titles have 5 or
                      fewer items left.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setInvFilter("low_stock");
                    setActiveTab("inventory");
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors shadow"
                >
                  Manage
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Out of Stock Alert</h4>
                    <p className="text-xs text-rose-800 dark:text-rose-200/80">
                      {stats.metrics.outOfStockBooksCount || 0} titles are
                      completely sold out.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setInvFilter("out_of_stock");
                    setActiveTab("inventory");
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow"
                >
                  Restock
                </button>
              </div>
            </div>

            {/* Quick Live Overview Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Recent
                      Customer Orders
                    </h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold flex items-center gap-1"
                    >
                      View All <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {stats.recentOrders.map((order: any) => (
                      <div
                        key={order._id}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            #{order._id.slice(-6).toUpperCase()} •{" "}
                            {order.userId?.username || "Guest"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.books?.length || 0} item(s) • NPR{" "}
                            {order.totalAmount}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            order.status === "delivered"
                              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80"
                              : order.status === "cancelled"
                              ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80"
                              : "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />{" "}
                      Latest Reviews & Ratings
                    </h3>
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 font-semibold flex items-center gap-1"
                    >
                      Moderate <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {stats.recentReviews.map((rev: any) => (
                      <div key={rev._id} className="py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {rev.bookId?.title || "Book"}
                          </span>
                          <div className="flex text-amber-400 text-xs">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 italic">
                          "{rev.comment}"
                        </p>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          by {rev.userId?.username || "Reader"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: BOOKS MANAGEMENT ===================== */}
        {activeTab === "books" && (
          <div className="space-y-6 animate-fade-in">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search books by title, author, or ISBN..."
                  value={bookSearch}
                  onChange={(e) => {
                    setBookSearch(e.target.value);
                    setBookPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={bookGenre}
                  onChange={(e) => {
                    setBookGenre(e.target.value);
                    setBookPage(1);
                  }}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Genres</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Self-Help">Self-Help</option>
                  <option value="Business & Investing">Business</option>
                  <option value="Science & Tech">Technology</option>
                  <option value="Psychology">Psychology</option>
                  <option value="Biography">Biography</option>
                </select>

                <button
                  onClick={() => {
                    setImportModalOpen(true);
                    if (olResults.length === 0 && !olQuery) {
                      setOlQuery("fiction bestseller");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition-all"
                >
                  <Globe className="w-4 h-4" /> Import from Open Library
                </button>

                <button
                  onClick={openAddBookModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Book
                </button>
              </div>
            </div>

            {/* Books Table */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Book Details</th>
                      <th className="px-6 py-4">Genre</th>
                      <th className="px-6 py-4">Price / Discount</th>
                      <th className="px-6 py-4">Stock</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {books.map((book) => (
                      <tr
                        key={book._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden flex-shrink-0">
                              <AppImage
                                src={book.image}
                                isbn={book.isbn}
                                coverId={(book as any).coverId}
                                openLibraryId={(book as any).openLibraryId}
                                author={book.author}
                                genre={book.genre}
                                alt={book.title}
                                fallbackType="book"
                                fallbackText={book.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {book.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                by {book.author}
                              </div>
                              {book.featured && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                            {book.genre || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            NPR {book.price}
                          </div>
                          {book.discountPercentage &&
                          book.discountPercentage > 0 ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              {book.discountPercentage}% OFF
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              No discount
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              (book.stock ?? 0) <= 0
                                ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                : (book.stock ?? 0) <= 5
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {book.stock ?? 0} in stock
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-slate-800 dark:text-slate-200">{book.rating?.toFixed(1) || "0.0"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditBookModal(book)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition-colors"
                              title="Edit Book"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteBook(book._id, book.title)
                              }
                              disabled={deletingBookId === book._id}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors"
                              title="Delete Book"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {bookTotalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Page {bookPage} of {bookTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBookPage((p) => Math.max(1, p - 1))}
                      disabled={bookPage <= 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setBookPage((p) => Math.min(bookTotalPages, p + 1))
                      }
                      disabled={bookPage >= bookTotalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: INVENTORY ===================== */}
        {activeTab === "inventory" && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  Total Products
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {invSummary.totalProducts}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm">
                <div className="text-xs text-amber-700 dark:text-amber-300 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Low Stock (1-5
                  units)
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                  {invSummary.lowStockCount}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 shadow-sm">
                <div className="text-xs text-rose-700 dark:text-rose-300 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Out of Stock (0 units)
                </div>
                <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                  {invSummary.outOfStockCount}
                </div>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search inventory items..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                {[
                  { key: "all", label: "All Items" },
                  { key: "low_stock", label: "Low Stock Alert" },
                  { key: "out_of_stock", label: "Out of Stock" },
                  { key: "in_stock", label: "Healthy Stock" },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setInvFilter(pill.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      invFilter === pill.key
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Quick Adjust</th>
                    <th className="px-6 py-4 text-right">Direct Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {inventory.map((item) => {
                    const currentStock = item.stock ?? 0;
                    const draftVal = stockInputs[item._id] ?? currentStock;
                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                          <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            {item.author}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                          NPR {item.price}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              currentStock <= 0
                                ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                : currentStock <= 5
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {currentStock} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleQuickStockUpdate(
                                  item._id,
                                  Math.max(0, currentStock - 1)
                                )
                              }
                              disabled={updatingStockId === item._id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                            >
                              -1
                            </button>
                            <button
                              onClick={() =>
                                handleQuickStockUpdate(
                                  item._id,
                                  currentStock + 5
                                )
                              }
                              disabled={updatingStockId === item._id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                            >
                              +5
                            </button>
                            <button
                              onClick={() =>
                                handleQuickStockUpdate(
                                  item._id,
                                  currentStock + 20
                                )
                              }
                              disabled={updatingStockId === item._id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                            >
                              +20
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min="0"
                              value={draftVal}
                              onChange={(e) =>
                                setStockInputs({
                                  ...stockInputs,
                                  [item._id]: Number(e.target.value),
                                })
                              }
                              className="w-20 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() =>
                                handleQuickStockUpdate(item._id, draftVal)
                              }
                              disabled={updatingStockId === item._id}
                              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                              title="Save Stock"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: ORDERS MANAGEMENT ===================== */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-in">
            {/* Order Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {[
                { key: "all", label: "All Orders" },
                { key: "pending", label: "Pending" },
                { key: "confirmed", label: "Confirmed" },
                { key: "processing", label: "Processing" },
                { key: "shipped", label: "Shipped" },
                { key: "delivered", label: "Delivered" },
                { key: "cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setOrderStatusFilter(tab.key);
                    setOrderPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    orderStatusFilter === tab.key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Order Ref</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {order.customerInfo?.fullName ||
                            order.shippingAddress?.fullName ||
                            order.userId?.username ||
                            "Customer"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.customerInfo?.email || order.userId?.email}
                        </div>
                        {(order.customerInfo?.phone ||
                          order.shippingAddress?.phone) && (
                          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                            📞 {order.customerInfo?.phone || order.shippingAddress?.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {order.books?.length || 0} item(s)
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                        NPR {order.totalAmount}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            order.status === "delivered"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : order.status === "cancelled"
                              ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenStatusModal(order)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-sm"
                          >
                            Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Order Pagination */}
              {orderTotalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Page {orderPage} of {orderTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      disabled={orderPage <= 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setOrderPage((p) => Math.min(orderTotalPages, p + 1))
                      }
                      disabled={orderPage >= orderTotalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: USERS & ROLES ===================== */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-fade-in">
            {/* User Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                {["all", "admin", "user"].map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setUserRoleFilter(role);
                      setUserPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                      userRoleFilter === role
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-700/80 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                            {user.username.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {user.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            user.role === "admin"
                              ? "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 dark:text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleUserRole(user)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            {user.role === "admin"
                              ? "Demote to User"
                              : "Promote to Admin"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={
                              deletingUserId === user._id ||
                              user._id === userDetails.id
                            }
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 disabled:opacity-30 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* User Pagination */}
              {userTotalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Page {userPage} of {userTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage <= 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setUserPage((p) => Math.min(userTotalPages, p + 1))
                      }
                      disabled={userPage >= userTotalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 6: REVIEW MODERATION ===================== */}
        {activeTab === "reviews" && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              {["all", "flagged", "published", "hidden"].map((status) => (
                <button
                  key={status}
                  onClick={() => setReviewStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    reviewStatusFilter === status
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Reviews Cards */}
            <div className="grid grid-cols-1 gap-4">
              {reviews.map((rev) => (
                <div
                  key={rev._id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {rev.bookId?.title || "Book"}
                      </span>
                      <div className="flex text-amber-400 text-xs">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300 dark:text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rev.status === "published"
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : rev.status === "flagged"
                            ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                      "{rev.reviewText}"
                    </p>

                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      by {rev.userId?.username} ({rev.userId?.email}) •{" "}
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </div>

                    {rev.isReported && rev.reportReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300">
                        <span className="font-bold">Flagged Reason:</span>{" "}
                        {rev.reportReason}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col justify-end gap-2 flex-shrink-0">
                    {rev.status !== "published" && (
                      <button
                        onClick={() =>
                          handleModerateReview(rev._id, "published")
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                      >
                        Approve / Publish
                      </button>
                    )}
                    {rev.status !== "hidden" && (
                      <button
                        onClick={() => handleModerateReview(rev._id, "hidden")}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 text-xs font-bold"
                      >
                        Hide Review
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReview(rev._id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 7: GENRES & AUTHORS ===================== */}
        {activeTab === "categories" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Tags className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Genres & Category
                Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.genre}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-2">
                      {cat.genre}
                    </div>
                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Books in Catalog:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cat.bookCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Inventory Stock:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cat.totalStock}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Price:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          NPR {cat.avgPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Author
                Directory
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {authors.map((auth) => (
                  <div
                    key={auth.author}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2">
                      {auth.author}
                    </div>
                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Published Works:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {auth.bookCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Reader Rating:</span>
                        <span className="font-bold text-amber-500 dark:text-amber-400">
                          ★ {auth.avgRating || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== ADD / EDIT BOOK MODAL ===================== */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editingBook ? "Edit Book" : "Add New Book to Store"}
              </h2>
              <button
                onClick={() => setBookModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.title}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Author *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, author: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Genre *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.genre}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, genre: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, isbn: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Price (NPR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.price}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bookForm.discountPercentage}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        discountPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.stock}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        stock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={bookForm.image}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, image: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Book Description
                </label>
                <textarea
                  rows={3}
                  value={bookForm.description}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={bookForm.featured}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, featured: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                  />
                  Featured in Store
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={bookForm.isNewArrival}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        isNewArrival: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                  />
                  New Arrival
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {savingBook ? "Saving..." : "Save Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== ORDER STATUS MODAL ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Update Order #{selectedOrder._id.slice(-6).toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Fulfillment Information */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Customer:{" "}
                  <span className="font-normal text-slate-900 dark:text-white">
                    {selectedOrder.customerInfo?.fullName ||
                      selectedOrder.shippingAddress?.fullName ||
                      selectedOrder.userId?.username ||
                      "Customer"}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Email:{" "}
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedOrder.customerInfo?.email ||
                      selectedOrder.shippingAddress?.email ||
                      selectedOrder.userId?.email ||
                      "N/A"}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Phone:{" "}
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedOrder.customerInfo?.phone ||
                      selectedOrder.shippingAddress?.phone ||
                      "N/A"}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Address:{" "}
                  <span className="text-slate-800 dark:text-slate-200">
                    {typeof selectedOrder.shippingAddress === "string"
                      ? selectedOrder.shippingAddress
                      : selectedOrder.shippingAddress?.street ||
                        selectedOrder.shippingAddress?.city ||
                        "Standard Delivery"}
                  </span>
                </div>
                {selectedOrder.orderNote && (
                  <div className="text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    Note: {selectedOrder.orderNote}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Select New Lifecycle Status
                </label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Status Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g., Courier tracking code, verified address..."
                  value={orderStatusNote}
                  onChange={(e) => setOrderStatusNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateOrderStatus}
                  disabled={updatingOrderStatus}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {updatingOrderStatus ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== OPEN LIBRARY IMPORT MODAL ===================== */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Import Books from Open Library
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Search Open Library's public catalog, preview covers, and import to your local MongoDB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar & Quick Chips */}
            <div className="space-y-3">
              <form onSubmit={(e) => handleSearchOpenLibrary(e)} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by book title, author, or ISBN (e.g. 'Dune', 'Atomic Habits', '9780062316097')..."
                    value={olQuery}
                    onChange={(e) => setOlQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={olSearching}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {olSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Search
                    </>
                  )}
                </button>
              </form>

              {/* Quick Topic Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold whitespace-nowrap">
                  Suggestions:
                </span>
                {[
                  "Atomic Habits",
                  "Dune",
                  "1984",
                  "Psychology of Money",
                  "The Silent Patient",
                  "Steve Jobs",
                  "Clean Code",
                  "Karnali Blues",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSearchOpenLibrary(undefined, chip)}
                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-purple-100 dark:hover:bg-purple-950/50 hover:text-purple-600 dark:hover:text-purple-300 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap transition border border-slate-200/60 dark:border-slate-700/60"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid / List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[320px] max-h-[500px]">
              {olSearching ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Fetching verified metadata & covers from Open Library...</p>
                </div>
              ) : olResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
                  <BookOpen className="w-12 h-12 mb-3 opacity-40 text-purple-500" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No Open Library search results yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Enter a title, author name, or 10/13-digit ISBN above and press Search to discover public domain and published books.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {olResults.map((b) => {
                    const currentSetting = importSettings[b.openLibraryId] || {
                      price: b.suggestedPriceNPR || 799,
                      stock: 25,
                      genre: b.genre || "Fiction",
                    };
                    const isImporting = importingBookId === b.openLibraryId;

                    return (
                      <div
                        key={b.openLibraryId}
                        className={`flex gap-4 p-4 rounded-2xl border transition shadow-sm ${
                          b.isAlreadyImported
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/40"
                            : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-purple-500/40"
                        }`}
                      >
                        {/* Book Cover Preview */}
                        <div className="w-20 aspect-[2/3] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex-shrink-0">
                          <AppImage
                            src={b.coverUrl}
                            isbn={b.isbn}
                            coverId={b.coverId}
                            openLibraryId={b.openLibraryId}
                            author={b.author}
                            genre={b.genre}
                            alt={b.title}
                            fallbackType="book"
                            fallbackText={b.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Metadata & Controls */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 truncate">
                                {b.genre || "General"}
                              </span>
                              {b.isAlreadyImported && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> In Store
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                              {b.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              by {b.author}
                            </p>
                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                              {b.isbn && <span>ISBN: {b.isbn}</span>}
                              {b.pages ? <span>• {b.pages} pages</span> : null}
                              {b.firstPublishYear && (
                                <span>• Year: {b.firstPublishYear}</span>
                              )}
                            </div>
                          </div>

                          {/* Price / Stock Customization & Import Button */}
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Store Price (NPR)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={currentSetting.price}
                                  onChange={(e) =>
                                    setImportSettings({
                                      ...importSettings,
                                      [b.openLibraryId]: {
                                        ...currentSetting,
                                        price: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Stock Units
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={currentSetting.stock}
                                  onChange={(e) =>
                                    setImportSettings({
                                      ...importSettings,
                                      [b.openLibraryId]: {
                                        ...currentSetting,
                                        stock: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleImportBook(b)}
                              disabled={isImporting}
                              className={`w-full py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition ${
                                b.isAlreadyImported
                                  ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
                              } disabled:opacity-50`}
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing to MongoDB...
                                </>
                              ) : b.isAlreadyImported ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Update / Re-Import
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" /> Import to Catalog (NPR {currentSetting.price})
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <span>Source: OpenLibrary.org Public Catalog & Covers API</span>
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default AdminDashboardPage;
