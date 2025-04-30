import {
  createBrowserRouter,
  RouterProvider as RouterProviderD,
} from "react-router-dom";
import { HomePage } from "./pages/home";
import { RegisterPage } from "./pages/register";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { MainPage } from "./pages/main";
import { MemesPage } from "./components/memespage";
import { ShoppingCarts } from "./pages/shooping";
import {CheckoutPage} from "./components/checkout";
import Payment from "./components/payment";
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },

  {
    path: "/books",
    element: <MainPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "books/register",
    element: <RegisterPage />,
  },
  {
    path: "/books/login",
    element: <LoginPage />,
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
    path: "/books/memes",
    element: <MemesPage />,
  },
 {
  path:"/cart",
  element:<ShoppingCarts/>
 },
 {
  path:"/Checkout",
  element:<CheckoutPage />
 },
 {
  path:"/payment",
  element:<Payment />
 }

]);

export function RouterProvider() {
  return <RouterProviderD router={router} />;
}
