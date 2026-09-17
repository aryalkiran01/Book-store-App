import React, { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider as RouterProviderD,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { KitabGharLogo } from "./components/common/KitabGharLogo";

// Lazy load pages for code splitting & faster initial paint
const HomePage = lazy(() =>
  import("./pages/home").then((m) => ({ default: m.HomePage }))
);
const RegisterPage = lazy(() =>
  import("./pages/register").then((m) => ({ default: m.RegisterPage }))
);
const LoginPage = lazy(() =>
  import("./pages/login").then((m) => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
  import("./pages/dashboard").then((m) => ({ default: m.DashboardPage }))
);
const CatalogPage = lazy(() =>
  import("./pages/CatalogPage").then((m) => ({ default: m.CatalogPage }))
);
const BookDetailsPage = lazy(() =>
  import("./pages/BookDetailsPage").then((m) => ({ default: m.BookDetailsPage }))
);
const MemesPage = lazy(() =>
  import("./components/memespage").then((m) => ({ default: m.MemesPage }))
);
const CartPage = lazy(() =>
  import("./pages/CartPage").then((m) => ({ default: m.CartPage }))
);
const WishlistPage = lazy(() =>
  import("./pages/WishlistPage").then((m) => ({ default: m.WishlistPage }))
);
const CheckoutPage = lazy(() =>
  import("./components/checkout").then((m) => ({ default: m.CheckoutPage }))
);
const PaymentPage = lazy(() =>
  import("./pages/PaymentPage").then((m) => ({ default: m.PaymentPage }))
);
const PaymentCallbackPage = lazy(() =>
  import("./pages/PaymentCallbackPage").then((m) => ({ default: m.PaymentCallbackPage }))
);
const OrderSuccessPage = lazy(() =>
  import("./pages/OrderSuccessPage").then((m) => ({ default: m.OrderSuccessPage }))
);
const OrderHistoryPage = lazy(() =>
  import("./pages/OrderHistoryPage").then((m) => ({ default: m.OrderHistoryPage }))
);
const OrderDetailsPage = lazy(() =>
  import("./pages/OrderDetailsPage").then((m) => ({ default: m.OrderDetailsPage }))
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const AccountOverviewPage = lazy(() =>
  import("./pages/AccountOverviewPage").then((m) => ({ default: m.AccountOverviewPage }))
);
const AccountSecurityPage = lazy(() =>
  import("./pages/AccountSecurityPage").then((m) => ({ default: m.AccountSecurityPage }))
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);


export const PageFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white transition-colors duration-300"
  >
    <div className="relative flex items-center justify-center mb-5">
      {/* Background Pulse Glow */}
      <div className="absolute w-20 h-20 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-xl animate-pulse"></div>
      
      {/* Central Pulsing Standalone Icon */}
      <div className="relative z-10 animate-bounce duration-1000">
        <KitabGharLogo variant="icon-only" size="lg" className="h-14 w-14 drop-shadow-md" />
      </div>
    </div>
    
    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
      <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
      <span>Loading Kitab Ghar...</span>
    </div>
    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your Literary Haven</p>
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: withSuspense(HomePage),
  },
  {
    path: "/books",
    element: withSuspense(CatalogPage),
  },
  {
    path: "/catalog",
    element: withSuspense(CatalogPage),
  },
  {
    path: "/books/:id",
    element: withSuspense(BookDetailsPage),
  },
  {
    path: "/book/:id",
    element: withSuspense(BookDetailsPage),
  },
  {
    path: "/cart",
    element: withSuspense(CartPage),
  },
  {
    path: "/shopping-cart",
    element: withSuspense(CartPage),
  },
  {
    path: "/wishlist",
    element: withSuspense(WishlistPage),
  },
  {
    path: "/register",
    element: withSuspense(RegisterPage),
  },
  {
    path: "/login",
    element: withSuspense(LoginPage),
  },
  {
    path: "/dashboard",
    element: (
      <AdminRoute>
        {withSuspense(DashboardPage)}
      </AdminRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        {withSuspense(DashboardPage)}
      </AdminRoute>
    ),
  },
  {
    path: "/admin/*",
    element: (
      <AdminRoute>
        {withSuspense(DashboardPage)}
      </AdminRoute>
    ),
  },
  {
    path: "/memes",
    element: withSuspense(MemesPage),
  },
  {
    path: "/checkout",
    element: (
      <ProtectedRoute>
        {withSuspense(CheckoutPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/Checkout",
    element: (
      <ProtectedRoute>
        {withSuspense(CheckoutPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/payment",
    element: (
      <ProtectedRoute>
        {withSuspense(PaymentPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/payment/callback",
    element: withSuspense(PaymentCallbackPage),
  },
  {
    path: "/order-success",
    element: withSuspense(OrderSuccessPage),
  },
  {
    path: "/order-confirmation",
    element: withSuspense(OrderSuccessPage),
  },
  {
    path: "/orders",
    element: (
      <ProtectedRoute>
        {withSuspense(OrderHistoryPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/my-orders",
    element: (
      <ProtectedRoute>
        {withSuspense(OrderHistoryPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders/:orderId",
    element: (
      <ProtectedRoute>
        {withSuspense(OrderDetailsPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/account",
    element: (
      <ProtectedRoute>
        {withSuspense(AccountOverviewPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/account/overview",
    element: (
      <ProtectedRoute>
        {withSuspense(AccountOverviewPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/account/profile",
    element: (
      <ProtectedRoute>
        {withSuspense(ProfilePage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/account/security",
    element: (
      <ProtectedRoute>
        {withSuspense(AccountSecurityPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        {withSuspense(ProfilePage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/my-profile",
    element: (
      <ProtectedRoute>
        {withSuspense(ProfilePage)}
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: withSuspense(NotFoundPage),
  },
]);


export function RouterProvider() {
  return <RouterProviderD router={router} />;
}
