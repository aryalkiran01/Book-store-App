import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { BellIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Toaster } from "react-hot-toast";
import { User } from "./auth/user";
import { Link } from "react-router-dom";
import { Logout } from "./auth/logout";
import { IoBookSharp } from "react-icons/io5";

const navigation = [
  { name: "Dashboard", href: "/dashboard", current: false },
  { name: "Books", href: "/dashboard", current: false }, // Assuming this is a page listing books
  { name: "Review", href: "/review", current: false },  // This points to the review page
  { name: "Authors", href: "/authors", current: false },
  { name: "Genres", href: "/genres", current: false },
];


export function AppShell({ children }) {
  return (
    <div className="min-h-full bg-gray-50">
      {/* Desktop Navigation */}
      <nav className="bg-gradient-to-r from-slate-900 to-purple-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Website Name */}
            <div className="flex items-center space-x-2">
            <IoBookSharp className="fill-white text-xl"/>
              <div className="text-white text-xl font-semibold ">
                Book Review App
              </div>
            </div>

            {/* Quote in the middle of the Nav Bar */}
            <div className=" ml-22 flex-1 flex justify-center items-center">
              <div className="text-sm italic text-white opacity-80">
                “A room without books is like a body without a soul.”
              </div>
            </div>

            {/* Navigation Links */}
            <div className="ml-10 flex items-baseline space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    item.current
                      ? "bg-indigo-800 text-white"
                      : "text-indigo-200 hover:bg-indigo-800 hover:text-white",
                    "rounded-md px-3 py-2 text-sm font-medium transition duration-150 ease-in-out"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* noti and profile */}
            <div className="flex items-center space-x-4">
             
              <button className="relative p-1 rounded-full text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700">
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>

             {/* profile */}
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center rounded-full bg-indigo-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700">
                  <span className="sr-only">Open user menu</span>
                  <User />
                </MenuButton>
                <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <MenuItem>
                    <Logout />
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
        <Toaster />
      </main>
    </div>
  );
}
