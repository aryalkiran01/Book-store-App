import React from "react";

type GoogleBookCardProps = {
  book: {
    volumeInfo: {
      title: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
      };
      previewLink: string;
      description?: string;
      publishedDate?: string;
    };
  };
};

const GoogleBookCard: React.FC<GoogleBookCardProps> = ({ book }) => {
  const { volumeInfo } = book;
  const {
    title,
    authors,
    imageLinks,
    previewLink,
    
    publishedDate,
  } = volumeInfo;

  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-md transition duration-300">
      <img
        src={imageLinks?.thumbnail || "https://via.placeholder.com/128x193"}
        alt={title}
        className="w-full h-48 object-contain mb-2"
      />
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-gray-600 mb-1">{authors?.join(", ")}</p>
      <p className="text-xs text-gray-500 mb-2">{publishedDate}</p>
      <a
        href={previewLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 text-sm underline"
      >
        Read Preview
      </a>
    </div>
  );
};

export default GoogleBookCard;
