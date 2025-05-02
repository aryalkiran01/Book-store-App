import { useState, useEffect } from "react";
import { FaTrash, FaRegBookmark, FaChevronLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface Book {
  _id: string;
  title: string;
  author: string;
  price: number;
  image: string;
  quantity: number;
}

const ShoppingCart = () => {
    const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<Book[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart) as Book[]);
    }

    const handleStorageChange = () => {
      const updatedCart = localStorage.getItem("cart");
      setCartItems(updatedCart ? JSON.parse(updatedCart) : []);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updateQuantity = (id: string, amount: number) => {
    const updatedCart = cartItems.map((book) =>
      book._id === id ? { ...book, quantity: Math.max(1, book.quantity + amount) } : book
    );
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
  };

  const removeFromCart = (id: string) => {
    const updatedCart = cartItems.filter((book) => book._id !== id);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
  };

  // Calculate the total price
  const subtotal = cartItems.reduce((acc, book) => {
    const price = Number(book.price) || 0;
    const quantity = Number(book.quantity) || 1;
    return acc + price * quantity;
  }, 0);
  

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-6">
      {/* Shopping Cart Section */}
      <div className="md:w-2/3">
        <h2 className="text-2xl font-bold mb-4">Shopping Cart ({cartItems.length})</h2>
        {cartItems.length === 0 ? (
          <p className="text-gray-500">Your cart is empty.</p>
        ) : (
          <div className="space-y-6">
            {cartItems.map((book) => (
              <div key={book._id} className="flex items-center gap-4 border-b pb-4">
                <img src={book.image} alt={book.title} className="w-20 h-28 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{book.title}</h3>
                  <p className="text-gray-500">by {book.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">Rs. {book.price}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(book._id, -1)}
                      className="border px-2 py-1 rounded"
                    >
                      -
                    </button>
                    <span>{book.quantity}</span>
                    <button
                      onClick={() => updateQuantity(book._id, 1)}
                      className="border px-2 py-1 rounded"
                    >
                      +
                    </button>
                    <button onClick={() => removeFromCart(book._id)} className="text-red-500">
                      <FaTrash />
                    </button>
                    <button className="text-gray-500">
                      <FaRegBookmark />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-12 text-2xl font-bold mb-4 flex items-center cursor-pointer">
          <FaChevronLeft />
          <p className="ml-2">Continue Shopping</p>
        </div>
      </div>

      {/* Order Summary Section */}
      <div className="md:w-1/3 bg-gray-100 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
        <div className="flex justify-between mb-2">
          <span>Subtotal</span>
          <span className="font-bold">Rs. {subtotal}</span>
        </div>
        <div className="flex items-center gap-2 border p-3 rounded cursor-pointer mb-4">
          <input type="checkbox" id="gift" className="cursor-pointer" />
          <label htmlFor="gift" className="cursor-pointer">
            Is this a gift? (+ Rs. 25 for gift wrap)
          </label>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Discounts can be applied at the next window. Shipping costs will be calculated at the checkout page.
        </p>
        <button onClick={()=> navigate("/Checkout")} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
          PROCEED TO CHECKOUT
        </button>

        {/* Payment Options */}
        <div className="mt-6">
          <p className="text-gray-600 mb-2">Payment Options:</p>
          <div className="flex gap-2">
            <img src="https://seeklogo.com/images/F/fonepay-logo-C9B7151FD6-seeklogo.com.png" alt="FonePay" className="h-8" />
            <img src="https://esewamoneytransfer.com/assets/logo-03.png" alt="eSewa" className="h-8" />
            <img src="https://static.vecteezy.com/system/resources/previews/030/740/487/non_2x/cash-on-delivery-logo-free-png.png" alt="Cash on Delivery" className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
