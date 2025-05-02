import { useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { TbTruckDelivery } from "react-icons/tb";
import { LuStore } from "react-icons/lu";
import { AppShell } from "./AppShell";
import {User} from './auth/user'
import { useCreateOrder } from "../api/order/query";
import { useUserDetailsStore } from "../store/useUsersDetails";


interface Book {

  _id: string;
  title: string;
  author: string;
  price: number;
  image: string;
  quantity: number;
  ShippingCost: number;
}

export const CheckoutPage = () => {
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState<Book[]>([]);
  const [showOrderList, setShowOrderList] = useState(false);
  const [showShippingDetails, setShowShippingDetails] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  const {userDetails} = useUserDetailsStore();

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
     
      setCartItems(JSON.parse(savedCart) as Book[]);
    }
  }, []);

  const subtotal = cartItems.reduce((acc, book) => {
    const price = Number(book.price) || 0;
    const quantity = Number(book.quantity) || 1;
    return acc + price * quantity;
  }, 0);
  const { mutate: createOrderMutation } = useCreateOrder();

  const handleProceedToPayment = () => {
    const orderData = {
      userId: userDetails.id, 
      books: cartItems.map((item) => ({
        bookId: item._id,
        quantity: item.quantity,
      })),
      totalAmount: total,
      subtotal, 
      shippingCost,
      discount,
    };

    console.log("orderData ", orderData)
  
    createOrderMutation(orderData, {
      onSuccess: (order) => {
        localStorage.setItem("orderDetails", JSON.stringify(order));
        navigate("/payment", { state: { orderDetails: order } });
        console.log("Order before navigating to payment:", order);

      },
    });
  };
  
  
  

  const shippingCost = 150;
  const discount = 0;
  const total = subtotal + shippingCost - discount;
  const totalWeight = cartItems.reduce((acc, book) => acc + book.quantity * 500, 0); // Assuming 

  return (
    <>
    <AppShell/>
    <User/>
    <div className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-6">
      <div className="md:w-2/3">
        {!showShippingDetails ? (
          <div className="p-6 bg-white shadow rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Personal Details</h3>
            <input type="text" placeholder="Full Name" className="border p-2 w-full mt-2" />
            <input type="email" placeholder="Email Address" className="border p-2 w-full mt-2" />
            <input type="tel" placeholder="Phone Number" className="border p-2 w-full mt-2" />

            <div className="flex justify-between">
              <button
                className="w-80 flex justify-between items-center text-gray-800 py-2 px-4 mt-4 rounded-md shadow-md"
                onClick={() => setShowOrderList(!showOrderList)}
              >
                <div>
                  <p className="font-semibold">View Order</p>
                  <p className="text-sm text-gray-500">Your order list</p>
                </div>
                {showOrderList ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              <button
                className="w-80 flex justify-between items-center bg-gray-100 text-gray-800 py-2 px-4 mt-4 rounded-md shadow-md"
                onClick={() => setShowShippingDetails(true)}
              >
                <div>
                  <p className="font-semibold">Next</p>
                  <p className="text-sm text-gray-500">Shipping Details</p>
                </div>
               <FaChevronDown />
              </button>
            </div>
            {showOrderList && (
              <div className="mt-4 p-4 border rounded-md bg-white shadow">
                <h2 className="text-lg font-bold mb-2">Your order list ({cartItems.length} items)</h2>
                {cartItems.length > 0 ? (
                  cartItems.map((book) => (
                    <div key={book._id} className="flex items-center gap-4 border-b pb-4">
                      <img src={book.image} alt={book.title} className="w-16 h-24 object-cover rounded" />
                      <div>
                        <h3 className="text-lg font-semibold">{book.title}</h3>
                        <p className="text-gray-500">by {book.author}</p>
                        <p className="font-bold">Rs. {book.price} x {book.quantity}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Your cart is empty.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-white shadow rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Delivery Details</h3>
            <h4 className="text-xl font-semibold mb-4">How would you like to receive your order?</h4>
            <div className="border p-4 rounded-md">
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="delivery" defaultChecked />
      <span className="flex items-center gap-2">
        <TbTruckDelivery /> Delivery to my location
      </span>
    </label>
    <p className="text-sm text-gray-500">Get your order delivered to a location of your choice.</p>
    <input type="text" placeholder=" Your Address" className="border p-2 w-full mt-2" />
  </div>
  
  <div className="border p-4 rounded-md mt-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="delivery" />
      <span className="flex items-center gap-2">
        <LuStore /> Pick up at store
      </span>
    </label>
    <p className="text-sm text-gray-500">Pickup your order at our physical book-store by yourself.</p>
  </div>
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Your Saved Addresses (0)</h4>
              <div className="border p-4 rounded-md mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="address" />
                  <span>Home Address</span>
                </label>
                <button className="text-blue-500 text-sm mt-1">+ Add</button>
              </div>
              <div className="border p-4 rounded-md">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="address" />
                  <span>Office Address</span>
                </label>
                <button className="text-blue-500 text-sm mt-1">+ Add</button>
              </div>
              <button className="text-blue-500 text-sm mt-2">+ New Address</button>
            </div>
            <textarea className="border p-2 w-full mt-4" placeholder="Order Note (Optional) [max 500 characters]"></textarea>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="md:w-1/3 p-6 bg-white shadow rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Order Summary ({cartItems.length})</h3>
        <input 
          type="text" 
          placeholder="Enter Discount Code" 
          className="border p-2 w-full mt-2"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
        />
        <button className="bg-blue-600 text-white py-2 px-4 rounded-md w-full mt-2">APPLY</button>

        <div className="mt-4">
          <p className="flex justify-between font-semibold"><span>Subtotal:</span> <span>Rs. {subtotal}</span></p>
          <p className="flex justify-between text-gray-500"><span>Weight:</span> <span>{totalWeight} Grams</span></p>
          <p className="flex justify-between"><span>Shipping Cost:</span> <span>Rs. {shippingCost}</span></p>
          <p className="flex justify-between text-red-500"><span>Discount:</span> <span>Rs. {discount}</span></p>
          <p className="flex justify-between text-lg font-bold mt-2"><span>Total:</span> <span>Rs. {total}</span></p>
        </div>

        <button className="bg-green-600 text-white py-2 px-6 rounded-md w-full mt-4" onClick={handleProceedToPayment}>
  Proceed to Payment
</button>


      </div>
    </div>
    </>
  );
  
};
