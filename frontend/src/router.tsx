import {
  createBrowserRouter,
  RouterProvider as RouterProviderD,
} from "react-router-dom";
import { HomePage } from "./pages/home";
import { RegisterPage } from "./pages/register";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { MainPage } from "./pages/main";
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
]);

export function RouterProvider() {
  return <RouterProviderD router={router} />;
}
