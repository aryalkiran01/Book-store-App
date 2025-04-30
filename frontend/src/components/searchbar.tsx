import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CiSearch } from "react-icons/ci";

interface SearchResult {
  id: string;
  _source: {
    title: string;
    author?: string;
    content?: string;
  };
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  // Fetch suggestions from Elasticsearch
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get<SearchResult[]>("http://localhost:3000/search", {
        params: { query: searchQuery },
      });
      setSuggestions(response.data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (title: string) => {
    navigate(`/books?title=${encodeURIComponent(title)}`);
  };

  return (
    <div className="relative w-80">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        className="px-4 py-2 h-9 w-full rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          fetchSuggestions(e.target.value);
        }}
      />
      <CiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <ul className="absolute top-10 bg-white border rounded-md w-full shadow-lg z-10">
          {suggestions.map((item) => (
            <li
              key={item.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSuggestionClick(item._source?.title || "No Title")}
            >
              {item._source?.title || "No Title"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
