import  { useState,useEffect } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { BellIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Toaster } from "react-hot-toast";
import { User } from "./auth/user";
import { Link } from "react-router-dom";
import { Logout } from "./auth/logout";
import { IoBookSharp } from "react-icons/io5";
import SearchBar from "./searchbar";
import { FaOpencart } from "react-icons/fa6";



const Navigation = ({ mobile = false }) => {
  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Books", href: "/books" },
    { name: "Your Books", href: "/" },
  ];

  

  return (
    <ul className={clsx("flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-4", mobile ? "block space-y-2 p-4" : "hidden lg:flex")}> 
      {navigation.map((item) => (
        <li key={item.name}>
          <Link to={item.href} className="text-indigo-200 hover:bg-indigo-800 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition duration-150 ease-in-out">
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
   
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartCount(savedCart.length);

    // Listen for storage updates
    const handleStorageChange = () => {
      const updatedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(updatedCart.length);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div className="min-h-full bg-gray-50">
      <nav className="bg-gradient-to-r from-slate-900 to-purple-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-1 flex-shrink-0">
              <IoBookSharp className="fill-white text-2xl" />
              <span className="text-white text-xl font-semibold whitespace-nowrap">Book Store</span>
            </div>
            <div className="hidden md:flex flex-1 justify-center items-center">
              <div className="text-sm italic text-white opacity-80 whitespace-nowrap overflow-hidden text-ellipsis px-2">“Where books are, dreams begin.”</div>
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              <Navigation />
              <SearchBar />
              <button className="relative p-1 rounded-full text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
                <BellIcon className="h-6 w-6" aria-hidden="true" />

              </button>
              <Link to="/cart" className="relative p-1 rounded-full text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
                <FaOpencart className="h-6 w-6" aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center rounded-full bg-indigo-600 text-sm text-white focus:ring-2 focus:ring-white">
                  <User />
             
                  
                </MenuButton>
                {/* <FaOpencart  className="flex items-center rounded-full bg-indigo-800 text-sm texxt-white focus:ring-2 focus:ring-white ml-32"/> */}
                <MenuItems className="absolute right-0 mt-2 w-48 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                
                  <MenuItem>
                    <Logout />
                  </MenuItem>
                </MenuItems>
                
              </Menu>
            </div>
            <div className="lg:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2 rounded-lg focus:ring-2 focus:ring-white">
                {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
{mobileMenuOpen && (
  <div className="lg:hidden bg-slate-900 text-white px-6 py-8 space-y-6 flex flex-col items-center rounded-b-lg shadow-md transition-all duration-300 ease-in-out">
    
    {/* Navigation Links */}
    <div className="w-full space-y-2">
      {[
        { name: "Dashboard", href: "/dashboard" },
        { name: "Books", href: "/books" },
        { name: "Your Books", href: "/" },
      ].map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className="block text-center w-full text-white bg-indigo-600 hover:bg-blue-600 px-4 py-2 rounded-lg transition"
        >
          {item.name}
        </Link>
      ))}
    </div>

    {/* Search Bar */}
    <div className="w-full">
      <SearchBar />
    </div>

    {/* Cart Link */}
    <Link
      to="/cart"
      className="flex items-center justify-center space-x-2 w-full text-white bg-indigo-600 hover:bg-blue-600 px-4 py-2 rounded-lg transition"
    >
      <FaOpencart className="h-5 w-5" />
      <span>Cart</span>
      {cartCount > 0 && (
        <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {cartCount}
        </span>
      )}
    </Link>

    {/* Auth Section */}
    {localStorage.getItem("token") ? (
      <div className="flex flex-col items-center w-full space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <User />
        </div>
        <div className="w-full">
          <Logout />
        </div>
      </div>
    ) : (
      <div className="w-full space-y-2">
        <Link
          to="/login"
          className="block w-full text-center text-white bg-indigo-600 hover:bg-blue-600 px-4 py-2 rounded-lg transition"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="block w-full text-center text-white bg-indigo-600 hover:bg-blue-600 px-4 py-2 rounded-lg transition"
        >
          Register
        </Link>
      </div>
    )}
  </div>
)}




      </nav>
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"></div>
        <Toaster />
      </main>
    </div>
  );
}
