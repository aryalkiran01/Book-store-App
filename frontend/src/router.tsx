import {
  createBrowserRouter,
  RouterProvider as RouterProviderD,
} from "react-router-dom";
import { HomePage } from "./pages/home";
import { RegisterPage } from "./pages/register";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { CatalogPage } from "./pages/CatalogPage";
import { BookDetailsPage } from "./pages/BookDetailsPage";
import { MemesPage } from "./components/memespage";
import { CartPage } from "./pages/CartPage";
import { WishlistPage } from "./pages/WishlistPage";
import { CheckoutPage } from "./components/checkout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/books",
    element: <CatalogPage />,
  },
  {
    path: "/catalog",
    element: <CatalogPage />,
  },
  {
    path: "/books/:id",
    element: <BookDetailsPage />,
  },
  {
    path: "/book/:id",
    element: <BookDetailsPage />,
  },
  {
    path: "/cart",
    element: <CartPage />,
  },
  {
    path: "/shopping-cart",
    element: <CartPage />,
  },
  {
    path: "/wishlist",
    element: <WishlistPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/memes",
    element: <MemesPage />,
  },
  {
    path: "/checkout",
    element: <CheckoutPage />,
  },
  {
    path: "/Checkout",
    element: <CheckoutPage />,
  },
]);

export function RouterProvider() {
  return <RouterProviderD router={router} />;
}
