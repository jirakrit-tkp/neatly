"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const testimonials = [
  {
    id: 1,
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    customer: "Katherine,",
    company: "Company®",
    avatar: "/image/customer.png"
  },
  {
    id: 2,
    text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    customer: "Sarah,",
    company: "Tech Corp",
    avatar: "/image/customer.png"
  },
  {
    id: 3,
    text: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    customer: "Michael,",
    company: "Design Studio",
    avatar: "/image/customer.png"
  }
];

const Testimonial = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide functionality - change slide every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section
      className="
        bg-green-300
        w-full
        flex flex-col items-center
        py-16 md:py-32
        px-4 md:px-8
      "
      style={{
        minHeight: "602px",
        maxWidth: "100vw",
      }}
    >
      <div
        className="
          w-[359px] md:w-[1200px]
          flex flex-col items-center
          relative
        "
        style={{
          minHeight: "602px",
        }}
      >
        {/* Heading */}
        <h2
          className="
            text-[#2D5A27]
            text-[34px] md:text-[50px]
            font-normal
            text-center
            mb-8 md:mb-12
            font-serif
          "
        >
          Our Customer Says
        </h2>

        {/* Testimonial Content */}
        <div className="relative w-full flex justify-center items-center">
          {/* Navigation Buttons for desktop only */}
          <button
            onClick={prevSlide}
            className={`
              hidden md:flex
              absolute md:left-[-60px]
              w-10 h-10 md:w-12 md:h-12
              bg-transparent
              rounded-full
              items-center justify-center
              transition-colors duration-200
              z-10
              border-2 border-orange-400
              hover:border-orange-500
            `}
            aria-label="Previous testimonial"
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={nextSlide}
            className={`
              hidden md:flex
              absolute md:right-[-60px]
              w-10 h-10 md:w-12 md:h-12
              bg-transparent
              rounded-full
              items-center justify-center
              transition-colors duration-200
              z-10
              border-2 border-orange-400
              hover:border-orange-500
            `}
            aria-label="Next testimonial"
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Testimonial Text */}
          <div className="w-full max-w-[600px] md:max-w-[800px] text-center">
            <blockquote
              className="
                text-[#666] md:text-[#555]
                text-[14px] md:text-[16px]
                leading-relaxed
                italic
                mb-8 md:mb-10
                px-4
              "
            >
              {`"${testimonials[currentSlide].text}"`}
            </blockquote>

            {/* Customer Info */}
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden">
                  <Image
                    src={testimonials[currentSlide].avatar}
                    alt={testimonials[currentSlide].customer}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* ชื่อและบริษัทอยู่บรรทัดเดียวกัน */}
                <div className="flex flex-row items-center space-x-2 text-left">
                  <span className="text-[#999] text-[12px] md:text-[14px] font-medium">
                    {testimonials[currentSlide].customer}
                  </span>
                  <span className="text-[#999] text-[12px] md:text-[14px]">
                    {testimonials[currentSlide].company}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex space-x-2 mt-8 md:mt-12">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                w-2 h-2 md:w-3 md:h-3
                rounded-full
                transition-colors duration-200
                border-2
                ${
                  index === currentSlide
                    ? "bg-orange-400 border-orange-400"
                    : "bg-transparent border-orange-400 hover:bg-orange-200"
                }
              `}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Buttons for mobile only - put under the dots */}
        <div className="flex justify-center md:hidden space-x-4 mt-6">
          <button
            onClick={prevSlide}
            className="
              w-10 h-10
              bg-transparent
              rounded-full
              flex items-center justify-center
              transition-colors duration-200
              z-10
              border-2 border-orange-400
              hover:border-orange-500
            "
            aria-label="Previous testimonial"
          >
            <svg
              className="w-4 h-4 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="
              w-10 h-10
              bg-transparent
              rounded-full
              flex items-center justify-center
              transition-colors duration-200
              z-10
              border-2 border-orange-400
              hover:border-orange-500
            "
            aria-label="Next testimonial"
          >
            <svg
              className="w-4 h-4 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Auto Slide Indicator */}
        <div className="mt-4 text-[#999] text-[10px] md:text-[12px]">
        
        </div>
      </div>
    </section>
  );
};

export default Testimonial;