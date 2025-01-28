import React from "react";
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
import { CiSearch } from "react-icons/ci";

const Navigation = () => {
  const navigation = [
    { name: "Dashboard", href: "/dashboard", current: false },
    { name: "Books", href: "/books", current: false },
    { name: "Reviews", href: "/", current: false },
  ];

  return (
    <nav>
      <ul className="hidden lg:flex items-center space-x-4">
        {navigation.map((item) => (
          <li key={item.name}>
            <Link
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
          </li>
        ))}
      </ul>
    </nav>
  );
};

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50">
      <nav className="bg-gradient-to-r from-slate-900 to-purple-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-start space-x-2">
              <IoBookSharp className="fill-white text-2xl" />
              <div className="text-white text-xl font-semibold">
                Book Review App
              </div>
            </div>

            {/* Centered Quote and Search Bar */}
            <div className="hidden md:flex flex-1 justify-center items-center space-x-4">
              <div className="text-sm italic text-white opacity-80 text-center px-2">
                “A room without books is like a body without a soul.”
              </div>
              <div className="relative w-80">
                <input
                  type="text"
                  placeholder="Search"
                  className="px-4 py-2 h-9 w-full rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <CiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Navigation */}
            <Navigation />

            {/* User Controls */}
            <div className="flex items-center space-x-4">
              <button className="relative p-1 rounded-full text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700">
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>
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

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center justify-between mt-2">
            <div className="text-sm italic text-white opacity-80 text-center">
              “A room without books is like a body without a soul.”
            </div>
            <Menu as="div" className="relative">
              <MenuButton className="text-white px-2 py-1 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-white">
                Menu
              </MenuButton>
              <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              </MenuItems>
            </Menu>
          </div>
        </div>
      </nav>

      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
        <Toaster />
      </main>
    </div>
  );
}
