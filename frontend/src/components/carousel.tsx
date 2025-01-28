
"use client";
import image2 from '../assets/manga book.jpg';
import image3 from '../assets/new-arrival-mobile.png';

import thumbnail2 from "../assets/thumbnail2.jpg"
import image5 from '../assets/y51jn9yXZ3C6W9CWRUcP3cVCb0u4TcjCynwT1g6f.webp';
import { Carousel } from "flowbite-react";
export function Component() {
  return (
    <div className='w-full'>
    <div className="h-[500px]  max-w-5xl  mx-auto obesity-70 ">
      <Carousel pauseOnHover>
        <img src={image2} alt="Image 1" />
        <img src={image3} alt="Image 2" />
        <img src={thumbnail2} alt="Image 3" />
    
        <img src={image5} alt="Image 5" />
      </Carousel>
    </div>
    </div>
  );
}

export default Component;