import React, { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider as RouterProviderD,
} from "react-router-dom";
import { Loader2 } from "lucide-react";

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
const OrderSuccessPage = lazy(() =>
  import("./pages/OrderSuccessPage").then((m) => ({ default: m.OrderSuccessPage }))
);
const OrderHistoryPage = lazy(() =>
  import("./pages/OrderHistoryPage").then((m) => ({ default: m.OrderHistoryPage }))
);
const OrderDetailsPage = lazy(() =>
  import("./pages/OrderDetailsPage").then((m) => ({ default: m.OrderDetailsPage }))
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
    <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading page...</span>
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
    element: withSuspense(DashboardPage),
  },
  {
    path: "/admin",
    element: withSuspense(DashboardPage),
  },
  {
    path: "/admin/*",
    element: withSuspense(DashboardPage),
  },
  {
    path: "/memes",
    element: withSuspense(MemesPage),
  },
  {
    path: "/checkout",
    element: withSuspense(CheckoutPage),
  },
  {
    path: "/Checkout",
    element: withSuspense(CheckoutPage),
  },
  {
    path: "/payment",
    element: withSuspense(PaymentPage),
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
    element: withSuspense(OrderHistoryPage),
  },
  {
    path: "/my-orders",
    element: withSuspense(OrderHistoryPage),
  },
  {
    path: "/orders/:orderId",
    element: withSuspense(OrderDetailsPage),
  },
  {
    path: "*",
    element: withSuspense(NotFoundPage),
  },
]);

export function RouterProvider() {
  return <RouterProviderD router={router} />;
}
