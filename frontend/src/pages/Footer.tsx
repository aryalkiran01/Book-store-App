import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";

export function Footer() {
    return (
      <footer className="bg-gray-900 text-gray-200 py-10 mt-auto">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* About Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">About Us</h2>
              <p className="text-sm text-gray-400">
                Your one-stop platform for discovering, reviewing, and purchasing
                your favorite books. Our mission is to connect readers with books
                they’ll love.
              </p>
            </div>
  
            {/* Quick Links */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Quick Links</h2>
              <ul className="space-y-2">
                <li>
                  <Link to="/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/books" className="hover:text-white">
                    Books
                  </Link>
                </li>
                <li>
                  <Link to="/authors" className="hover:text-white">
                    Authors
                  </Link>
                </li>
                <li>
                  <Link to="/genres" className="hover:text-white">
                    Genres
                  </Link>
                </li>
              </ul>
            </div>
  
            {/* Contact Us */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Contact Us</h2>
              <p className="text-sm text-gray-400">
                Email: aryalkiran21@gmail.com
              </p>
              <p className="text-sm text-gray-400">
                Phone: +977 98-275-142-82
              </p>
              <p className="text-sm text-gray-400">
                Address: 14, Nayaguan - Butwal
              </p>
            </div>
  
            {/* Social Media */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Follow Us</h2>
              <div className="flex space-x-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-700 hover:bg-indigo-500"
                >
                  <FaFacebookF />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-700 hover:bg-blue-400"
                >
                  <FaTwitter />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-700 hover:bg-pink-500"
                >
                  <FaInstagram />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-700 hover:bg-blue-600"
                >
                  <FaLinkedinIn />
                </a>
              </div>
            </div>
          </div>
  
          {/* Footer Bottom */}
          <div className="mt-8 border-t border-gray-700 pt-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Book Website. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  }
  