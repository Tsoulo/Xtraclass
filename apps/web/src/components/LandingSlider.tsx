import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import kidsInClassImage from "@assets/xtraclass-logo-td.png";
import logoImage from "@assets/xtraclass-logo-td.png";

interface Slide {
  title: string;
  subtitle: string;
  backgroundImage: string;
  role?: string;
}

const slides: Slide[] = [
  {
    title: "Parents",
    subtitle: "Stay involved in your child's learning journey.",
    backgroundImage: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080",
  },
  {
    title: "Teachers",
    subtitle: "Plan, teach, and engage your students",
    backgroundImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080",
  },
  {
    title: "Student",
    subtitle: "Achieve more with personalized learning",
    backgroundImage: kidsInClassImage,
  },
];

export default function LandingSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinNow = () => {
    setLocation("/register");
  };

  const handleSignIn = () => {
    setLocation("/signin");
  };

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${slide.backgroundImage})`,
            }}
          />
          <div className="relative z-10 h-full flex flex-col justify-between p-6">
            {/* Logo */}
            <div className="flex justify-center pt-12">
              <div className="w-40 h-20 flex items-center justify-center">
                <img 
                  src={logoImage} 
                  alt="XtraClass.ai Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Content */}
            <div className="text-center text-white mb-20">
              <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
              <p className="text-xl mb-8 px-4">{slide.subtitle}</p>

              {/* Buttons */}
              <div className="space-y-4 px-8">
                <Button
                  onClick={handleJoinNow}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-6 rounded-full transition-colors"
                >
                  Join Now
                </Button>
                <Button
                  onClick={handleSignIn}
                  variant="outline"
                  className="w-full border-2 border-white bg-transparent text-white font-semibold py-4 px-6 rounded-full hover:bg-white hover:text-black transition-colors backdrop-blur-sm"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-3 h-3 rounded-full transition-opacity ${
              index === currentSlide
                ? "bg-white opacity-100"
                : "bg-white opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
