import { useState, useEffect } from "react";
import { useGetBooksQuery } from "../api/book/query";
import { MdNavigateNext } from "react-icons/md";
import { GrFormPrevious } from "react-icons/gr";
import tablepng from "../assets/pngegg.png";
import Component from "./carousel";
import { MdBookmarkAdded } from "react-icons/md";
import bookcollection from "../assets/book collection.png";
import book1 from "../assets/book2-2.png";
import book2 from "../assets/book3.png";
import book3 from "../assets/book1-1.png";
import book4 from "../assets/book4.png";
import book5 from "../assets/book5.png";
import { useNavigate } from "react-router-dom";
import finance from "../assets/finance_book-removebg-preview.png";

import { AppShell } from "./AppShell";
interface Book {
  _id: string;
  title: string;
  author: string;
  price: number;
}
export function HomePage() {
  const [cartItems, setCartItems] = useState<Book[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart) as Book[]);
    }
  }, []);

  const addToCart = (book: Book) => {
    const updatedCart = [...cartItems, book];
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
  };


  
  const { data, isLoading, isError, error } = useGetBooksQuery();

  const [visibleBooks, setVisibleBooks] = useState(3);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    [key: string]: boolean;
  }>({});
  const [genreScrollIndex, setGenreScrollIndex] = useState(0);
  const [bookScrollIndex, setBookScrollIndex] = useState(0);
  const handleGenreNext = () => setGenreScrollIndex((prev) => prev + 1);
  const handleGenrePrev = () =>
    setGenreScrollIndex((prev) => Math.max(prev - 1, 0));

  const handleBookNext = () => setBookScrollIndex((prev) => prev + 1);
  const handleBookPrev = () =>
    setBookScrollIndex((prev) => Math.max(prev - 1, 0));

  const handleLoadMore = () => setVisibleBooks((prev) => prev + 3);
  const handleShowLess = () => setVisibleBooks((prev) => Math.max(prev - 3, 3));

  const toggleDescription = (bookId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [bookId]: !prev[bookId],
    }));
  };
  const navigate = useNavigate();
  const handleLoginClick = () => {
    navigate("./login");
  };

  const navigater = useNavigate();
  const handleRegisterClick = () => {
    navigater("./register");
  };
  const genres = [
    { name: "Arts & Photography", icon: "🎨" },
    { name: "Boxed Sets", icon: "📦" },
    { name: "Business & Investing", icon: "💼" },
    { name: "Fiction & Literature", icon: "📖" },
    { name: "Foreign Languages", icon: "🌐" },
    { name: "History & Memoir", icon: "📜" },
    { name: "Kids & Teens", icon: "👦" },
    { name: "Learning & Reference", icon: "✏" },
    { name: "Lifestyle & Wellness", icon: "🧘" },
    { name: "Manga & Graphic Novels", icon: "📚" },
    { name: "Miscellaneous", icon: "💡" },
    { name: "Nature", icon: "🍃" },
    { name: "Nepali", icon: "🇳🇵" },
    { name: "Political Science", icon: "⚖️" },
    { name: "Rare Coffee Table Books", icon: "📚" },
    { name: "Religious", icon: "ૐ" },
    { name: "Self Improvement", icon: "🧠" },
    { name: "Technology", icon: "🧑🏼‍💻" },
    { name: "Travel", icon: "✈️" },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-purple-700">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-800 to-pink-500">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg shadow">
          {error.message}
        </div>
      </div>
    );
  }

  

  const bookData = data?.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-700 via-slate-100 to-blue-600">
     < AppShell />
      <Component />
      {/* Genres Section */}
      <div className="p-8">
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold mb-2">Genres</h2>
            <div className="flex gap-2">
              <button
                onClick={handleGenrePrev}
                className="bg-slate-200 text-blue-950 p-2 rounded-full shadow-lg"
              >
                <GrFormPrevious />
              </button>
              <button
                onClick={handleGenreNext}
                className="bg-slate-200 text-blue-950 p-2 rounded-full shadow-lg"
              >
                <MdNavigateNext />
              </button>
            </div>
          </div>
          <p className=" text-amber-950 text-lg mb-6">
            Browse Our Extensive Collection of Books Across Different Genres.
          </p>
          <div className="flex overflow-hidden relative">
            <div
              className="flex space-x-4 transition-transform duration-500"
              style={{ transform: `translateX(-${genreScrollIndex * 100}px)` }}
            >
              {genres.map((genre, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center space-y-2 text-center p-4  hover:shadow-2xl  "
                >
                  <div className="text-4xl">{genre.icon}</div>
                  <p className="text-sm font-medium">{genre.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stylish Heading */}
      <div className="text-center py-12 bg-gradient-to-r from-purple-700 via-slate-100 to-blue-600">
        <h1 className="text-5xl text-blue-950 tracking-wide drop-shadow-lg font-serif">
          What do you want to read?
        </h1>
        <p className="text-xl text-amber-950 mt-2">
          Find Your Next Great Read Among Our Best Sellers.
        </p>
      </div>

      {/* Book Slider Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="relative">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 transition-all duration-500 transform"
            style={{ transform: `translateX(-${bookScrollIndex * 100}%)` }}
          >
            {bookData.slice(0, visibleBooks).map((book) => {
              const isDescriptionExpanded = expandedDescriptions[book._id];

              return (
                <div
                  key={book._id}
                  className="group  from- via-slate-100 to-blue-950 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-transform duration-500 transform hover:scale-105"
                >
                  {/* Image Section */}
                  <div className="relative h-96">
                    <img
                      src={
                        book.image ||
                        "https://static-01.daraz.com.np/p/813072290c5c5d1e80d9c1c7794e2b8f.jpg"
                      }
                      alt={book.title}
                      className="w-full h-full object-contain transition-transform duration-700 "
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-75"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="text-xl font-bold text-white">
                        {book.title}
                      </h2>
                      <p className="text-sm text-amber-200">by {book.author}</p>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {book.genre.split(",").map((genre, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 text-xs font-medium text-purple-900 bg-purple-100 rounded-full"
                        >
                          {genre.trim()}
                        </span>
                      ))}
                    </div>
                    {/* Description */}
                    <div className="text-sm mb-4">
                      <p
                        className={isDescriptionExpanded ? "" : "line-clamp-2"}
                      >
                        {book.description}
                      </p>
                      <button
                        className="text-black text-xs mt-2"
                        onClick={() => toggleDescription(book._id)}
                      >
                        {isDescriptionExpanded ? "Show Less" : "Show More"}
                      </button>
                    </div>
                    <p className="text-lg text-black mb-2">Rs {book.price}</p>
                    <div className="flex flex-col justify-center items-center mt-4">
                      {/* Add to Cart Button */}
                      <button  onClick={() => addToCart(book)} className="px-9 py-2 border border-blue-500 text-blue-950 rounded-lg hover:bg-blue-500 hover:text-white transition text-lg">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center mt-6">
            <button
              onClick={handleBookPrev}
              className="bg-slate-200 text-blue-950 p-2 rounded-full shadow-lg mx-2"
            >
              <GrFormPrevious />
            </button>
            <button
              onClick={handleBookNext}
              className="bg-slate-200 text-blue-950 p-2 rounded-full shadow-lg mx-2"
            >
              <MdNavigateNext />
            </button>
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={handleLoadMore}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg mx-2"
            >
              Load More
            </button>
            <button
              onClick={handleShowLess}
              className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg mx-2"
            >
              Show Less
            </button>
          </div>
        </div>
      </div>
<div className="w-full mx-auto relative min-h-[450px] bg-slate-100 flex items-center">
  <div className="flex flex-col items-start justify-start pl-44 h-80">
    <div className="flex items-center mt-24">
      <MdBookmarkAdded className="text-6xl" />
      <h2 className="text-2xl font-semibold mb-2 pl-4">
        Used Books Starting at Just <br /> Rs. 250
      </h2>
    </div>
    <p className="text-lg mt-4">
      Explore a Wide Range of Popular Used Books in Excellent Condition.
    </p>
    <button className="mt-4 px-9 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition text-lg">
      Explore Books
    </button>
  </div>

  <div>
    {/* Book collection image visible only on desktop */}
    <div className="absolute top-1 right-0 z-30 mt-10 mr-52 hidden md:block">
      <img
        src={bookcollection}
        alt="Book Collection"
        className="w-[500px]"
      />
    </div>

    {/* Table image visible only on desktop */}
    <div className="absolute bottom-1/4 right-0 mr-52 hidden md:block">
      <img
        src={tablepng}
        alt="Table"
        className="h-52 w-[500px]"
      />
    </div>
  </div>
</div>

<div className="bg-slate-200 w-full mx-auto flex flex-col items-center justify-center relative">
  <div className="flex flex-col items-center justify-center">
    <p className="bold text-[20px] font-inter mt-20">
      Explore From Our Amazing Collection of
    </p>
    <p className="pr-10 font-bold text-black font-inter text-[40px] pl-20">
      Thousand of Nepali Books
    </p>
  </div>


  <div className="w-[170px] hidden sm:flex flex-row justify-center items-center absolute end1/5 mt-16 ml-20">
    <img src={book1} alt="" />
    <img src={book2} alt="" />
    <img src={book3} alt="" />
    <img src={book4} alt="" />
    <img src={book5} alt="" />
  </div>

  {/* Table image: hidden on mobile */}
  <div className="mt-36 sm:mt-44">
    <img
      src={tablepng}
      alt="Table"
      className="w-[990px] hidden sm:block"
    />
  </div>

  <button className="px-9 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition text-lg mt-16 mb-24">
    Explore Books
  </button>
</div>

<div className="bg-slate-300 w-full min-h-[600px] mx-auto flex flex-col items-start justify-start relative">
  <div className="flex flex-col items-start justify-start pl-6 sm:pl-10 md:pl-20 lg:pl-44 mt-16">
    <h1 className="text-2xl font-semibold mb-2">Our picks for you</h1>

    <p className="font-serif text-base sm:text-lg">
      We will curate special book recommendations for you <br className="hidden sm:block" />
      based on your genre preferences.
    </p>

    <p className="mt-5 font-semibold">Login or create account to get started.</p>

    <div className="flex flex-col sm:flex-row mt-5 gap-4">
      <button
        className="px-9 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition text-lg"
        onClick={handleLoginClick}
      >
        Login
      </button>
      <button
        className="px-9 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition text-lg"
        onClick={handleRegisterClick}
      >
        Register Now
      </button>
    </div>

    <div className="font-bold font-mono text-[28px] sm:text-[36px] lg:text-[40px] mt-10">
      <h1>
        THE MORE YOU LEARN, <br />
        <span>THE MORE YOU EARN....</span>
      </h1>
    </div>
  </div>


  <div className="absolute right-[10%] bottom-0 pb-32 hidden lg:block">
    <img src={finance} alt="Finance" className="rounded-lg shadow w-[350px] h-auto" />
  </div>
</div>

<div className="bg-slate-200 w-full mx-auto flex flex-col lg:flex-row items-start justify-start px-4 sm:px-10 lg:px-44 py-10">
  <div className="flex flex-col items-start justify-start w-full">
    <h1 className="font-bold text-[24px] sm:text-[30px]">Bestselling Authors</h1>
    <p className="text-base sm:text-lg mt-2">
      Discover Books by Bestselling Authors in Our Collection, Ranked by Popularity.
    </p>

    {/* Scrollable row of authors */}
    <div className="flex flex-row items-center mt-6 space-x-5 overflow-x-auto w-full pb-4">
      {[
        {
          name: "J.K. Rowling",
          src: "https://upload.wikimedia.org/wikipedia/commons/5/5d/J._K._Rowling_2010.jpg",
        },
        {
          name: "George R.R. Martin",
          src: "https://hips.hearstapps.com/hmg-prod/images/gettyimages-187751114.jpg?crop=1.00xw:1.00xh;0,0&resize=1200:*",
        },
        {
          name: "Stephen King",
          src: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Stephen_King%2C_Comicon.jpg",
        },
        {
          name: "James Clear",
          src: "https://images.squarespace-cdn.com/content/v1/5da5150079965b6c99a48868/1707175216487-8W0INSCEMXMMXEO0HJDK/James+Clear+Big+Image.jpg?format=1500w",
        },
        {
          name: "Paulo Coelho",
          src: "https://images3.penguinrandomhouse.com/author/5234",
        },
        {
          name: "Michelle Obama",
          src: "https://hips.hearstapps.com/hmg-prod/images/michelle-obama-gettyimages-85246899.jpg",
        },
        {
          name: "Colleen Hoover",
          src: "https://compote.slate.com/images/8cec4fe5-14b8-422e-b3b6-9edd3947b273.jpeg?crop=1560%2C1040%2Cx0%2Cy0",
        },
        {
          name: "Yuval Noah Harari",
          src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTGpIIv9u8iQ3fNwq5pgh46fuZSl38WUwqWA&s",
        },
      ].map((author, index) => (
        <div className="flex flex-col items-center min-w-[150px]" key={index}>
          <img
            src={author.src}
            alt={author.name}
            className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] rounded-full object-cover"
          />
          <p className="text-center mt-2 text-[14px] sm:text-[16px] font-mono">{author.name}</p>
        </div>
      ))}
    </div>
  </div>
</div>


    </div>
  );
}
export default HomePage;
