import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { 
  BookOpen, 
  Target, 
  Zap, 
  Users, 
  Award, 
  Sparkles,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Brain,
  Trophy,
  Star,
  Menu,
  X,
  ChevronRight,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { FaTwitter, FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/api";
import logoImage from "@assets/xtraclass-logo-td.png";
import mzwandileImage from "@assets/xtraclass-logo-td.png";
import ceboImage from "@assets/xtraclass-logo-td.png";
import vusaniImage from "@assets/xtraclass-logo-td.png";
import tshegofatsoImage from "@assets/xtraclass-logo-td.png";
import nelisileImage from "@assets/xtraclass-logo-td.png";
import thabangImage from "@assets/xtraclass-logo-td.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedBios, setExpandedBios] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const { scrollYProgress } = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const showComingSoon = () => {
    toast({
      title: "Coming Soon",
      description: "Subscriptions will be available soon. Stay tuned!",
    });
  };

  const scrollTeamCards = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollBy({ left: 350, behavior: 'smooth' });
      }
    }
  };
  
  // Optimized parallax transforms - minimal movement on mobile for smoothest performance
  // Mobile gets only 5% of desktop parallax effect for ultra-smooth scrolling
  const mobileFactor = isMobile ? 0.05 : 1;
  const disableParallax = prefersReducedMotion || false;
  
  const y1 = useTransform(scrollYProgress, [0, 1], [0, disableParallax ? 0 : -400 * mobileFactor]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, disableParallax ? 0 : -600 * mobileFactor]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, disableParallax ? 0 : -200 * mobileFactor]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, disableParallax ? 0 : 300 * mobileFactor]);
  const y5 = useTransform(scrollYProgress, [0, 1], [0, disableParallax ? 0 : -800 * mobileFactor]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, disableParallax || isMobile ? 1 : 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, disableParallax || isMobile ? 1 : 0.85]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, disableParallax || isMobile ? 0 : 360]);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Get personalized tutorials and instant feedback powered by advanced AI technology.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Target,
      title: "Adaptive Exercises",
      description: "Practice with exercises that adapt to your skill level and learning pace.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Trophy,
      title: "Gamified Progress",
      description: "Earn points, badges, and climb leaderboards while mastering new concepts.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Users,
      title: "Multi-Role Platform",
      description: "Seamlessly connect parents, teachers, students, and tutors in one ecosystem.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Award,
      title: "Real-Time Feedback",
      description: "Get instant grading and detailed explanations to learn from every mistake.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Sparkles,
      title: "Personalized Paths",
      description: "AI analyzes your performance and creates custom learning paths just for you.",
      color: "from-pink-500 to-rose-500"
    }
  ];

  const pricing = [
    {
      name: "Free",
      price: "R0",
      period: "/month",
      description: "Perfect for parents monitoring their children's progress",
      features: [
        "Track student progress",
        "View homework and grades",
        "Parent-teacher messaging",
        "Basic reports"
      ],
      cta: "Get Started",
      popular: false,
      comingSoon: false
    },
    {
      name: "Physical Science",
      price: "R200",
      period: "/month",
      description: "Full access for Physical Science students",
      features: [
        "Unlimited AI-powered exercises",
        "Personalized tutorials",
        "Instant AI grading",
        "Advanced analytics",
        "Gamification & leaderboards",
        "Priority support"
      ],
      cta: "Coming Soon",
      popular: false,
      comingSoon: true
    },
    {
      name: "Premium Mathematics",
      price: "R200",
      period: "/month",
      description: "Full access for Mathematics students",
      features: [
        "Unlimited AI-powered exercises",
        "Personalized tutorials",
        "Instant AI grading",
        "Advanced analytics",
        "Gamification & leaderboards",
        "Priority support"
      ],
      cta: "Get Started",
      popular: true,
      comingSoon: false
    },
    {
      name: "Premium Combo",
      price: "R300",
      period: "/month",
      description: "Full access for Physical Science & Mathematics",
      features: [
        "All Mathematics features",
        "All Physical Science features",
        "Unlimited AI-powered exercises",
        "Personalized tutorials",
        "Instant AI grading",
        "Priority support"
      ],
      cta: "Coming Soon",
      popular: false,
      comingSoon: true
    },
    {
      name: "School",
      price: "Custom",
      period: "",
      description: "Tailored solutions for educational institutions",
      features: [
        "Everything in Premium",
        "Custom curriculum integration",
        "Admin dashboard",
        "Bulk student management",
        "Dedicated account manager",
        "API access"
      ],
      cta: "Contact Sales",
      popular: false,
      comingSoon: false
    }
  ];

  const team = [
    {
      id: "mzwandile",
      name: "Mzwandile Maawu",
      role: "CEO & Founder",
      bio: [
        "Mzwandile has an undergraduate BEng degree in Industrial Engineering and a BEng Honours degree in Engineering Technology Management, both obtained at the University of Pretoria.",
        "His career experience spans across multiple industries such as supply chain, consulting, research and banking with his roles ranging from Engineer to Head of Analytics and Account Director for Listed Companies.",
        "With over 8 years of work experience, and 5 years of people management experience he has been charting the way for developing high performance teams in different industries. He is passionate about people and technology. Mzwandile is currently completing a BSc in Computing via UNISA."
      ],
      image: mzwandileImage
    },
    {
      id: "cebo",
      name: "Cebo Makeleni",
      role: "CTO",
      bio: [
        "Cebo Makeleni is a seasoned Software Engineer in the IT, hardware and banking spaces. Having completed a BSc Computer Science degree at the University of Pretoria, he started as a Software Engineer working on projects in the insurance space for a UK based client.",
        "Leading a small team before moving into the Cash devices space in the banking industry.",
        "He has experience working with cash devices, specifically ATMs, as a software engineer, integrating with the hardware, implementing security as well as maintaining the technology stack and monitoring. He has over 8 years of experience in the software engineering space."
      ],
      image: ceboImage
    },
    {
      id: "vusani",
      name: "Vusani Mulaudzi",
      role: "Architecture Head",
      bio: [
        "Vusani holds an Honours degree in BCom Informatics from the University of Pretoria and is a highly experienced software engineer, mentor, web hosting entrepreneur, and tech leader.",
        "With over 11 years of experience as a Software Engineer working in the banking, insurance, and consulting industries.",
        "Vusani has a proven track record of delivering high-quality software products while leading teams to success. Vusani is passionate about inspiring and empowering others to reach their full potential and is always eager to collaborate on innovative solutions."
      ],
      image: vusaniImage
    },
    {
      id: "tshegofatso",
      name: "Tshegofatso Modisakeng",
      role: "Product Head",
      bio: [
        "Tshegofatso is a Product Manager with over 5 years of experience in banking and mining, specializing in product strategy, product development, project management, business process re-engineering, and cross-functional team leadership.",
        "Tshego has a proven track record of delivering innovative solutions that meet customer needs, drive revenue growth, and improve operational efficiency.",
        "Tshego has earned qualifications from the University of Pretoria – an undergraduate BEng degree in Chemical Engineering and a BEng Honours degree in Industrial Engineering."
      ],
      image: tshegofatsoImage
    },
    {
      id: "nelisile",
      name: "Nelisile Nkosi",
      role: "IT Project Manager & Business Analyst",
      bio: [
        "Nelisile is an enthusiastic Business Analyst and IT Project Manager with a BCOM Informatics Bachelor's degree from the University of Pretoria, an honors degree from the University of South Africa (UNISA) as well as a certificate in data analysis from the University of Cape Town.",
        "Nelisile has 3 years working experience. She had a stint in Education as a Financial Administrator before transitioning into the banking and IT sector."
      ],
      image: nelisileImage
    },
    {
      id: "thabang",
      name: "Thabang Soulo",
      role: "Software Engineer",
      bio: [
        "Thabang is a full-stack software engineer with an IIE Bachelor of Communication Design degree from Vega and a graduate in Systems Development from WeThinkCode_.",
        "He has over 2 years of experience building modern web applications and working across the full technology stack."
      ],
      image: thabangImage
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="XtraClass.ai" className="h-8" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#mission" className="text-gray-700 hover:text-blue-600 transition font-medium">
                Mission
              </a>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-gray-700 hover:text-blue-600 font-medium bg-transparent">
                      Products
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-48 gap-3 p-4">
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#products-teachers"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">For Teachers</div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#products-students"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">For Students</div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#products-parents"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">For Parents</div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition font-medium">
                Testimonials
              </a>
              <a href="#team" className="text-gray-700 hover:text-blue-600 transition font-medium">
                Team
              </a>
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/signin')}
                className="text-gray-700 hover:text-blue-600 font-medium text-[16px]"
                data-testid="button-nav-signin"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => setLocation('/home')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="button-nav-signup"
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4 border-t border-gray-200"
            >
              <div className="flex flex-col gap-4">
                <a 
                  href="#mission" 
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mission
                </a>
                <div className="flex flex-col gap-2">
                  <span className="text-gray-900 font-semibold text-sm">Products</span>
                  <a 
                    href="#products-teachers" 
                    className="text-gray-600 hover:text-blue-600 transition text-sm pl-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Teachers
                  </a>
                  <a 
                    href="#products-students" 
                    className="text-gray-600 hover:text-blue-600 transition text-sm pl-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Students
                  </a>
                  <a 
                    href="#products-parents" 
                    className="text-gray-600 hover:text-blue-600 transition text-sm pl-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Parents
                  </a>
                </div>
                <a 
                  href="#pricing" 
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <a 
                  href="#testimonials" 
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </a>
                <a 
                  href="#team" 
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Team
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-blue-600 transition font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/signin');
                    setMobileMenuOpen(false);
                  }}
                  data-testid="link-mobile-signin"
                >
                  Sign In
                </a>
                <Button 
                  onClick={() => setLocation('/home')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  data-testid="button-mobile-signup"
                >
                  Get Started
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>
      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y1, 
            opacity, 
            scale, 
            willChange: isMobile ? 'auto' : 'transform, opacity',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </motion.div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Transforming African Education
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed">
                Africa's first AI-powered learning platform, dedicated to empowering the next generation of doctors, engineers, and scientists across the continent.
              </p>
              <div className="text-center text-gray-600 mb-8">
                <span className="text-lg">Building Africa's Future, One Student at a Time</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => setLocation('/home')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6"
                  data-testid="button-hero-signup"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-lg px-8 py-6 border-2"
                  data-testid="button-learn-more"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Mission Statement Section */}
      <section id="mission" className="py-20 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Target className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h2 className="text-4xl font-bold mb-6 text-gray-900">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              XtraClass.ai was born from a simple yet powerful belief: <strong>every African child deserves 
              access to world-class STEM education</strong>. We're on a mission to bridge the educational gap, 
              providing personalized, AI-driven learning experiences that prepare students for careers in 
              medicine, engineering, technology, and scientific research.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              By combining cutting-edge artificial intelligence with deep understanding of African curricula 
              and learning contexts, we're creating the tools that will empower millions of students to 
              achieve their dreams and contribute to Africa's growth and development.
            </p>
          </motion.div>
        </div>
      </section>
      {/* Product Info Section */}
      <section id="products" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              What We Offer
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A comprehensive learning ecosystem designed for the African educational landscape
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">AI-Powered Learning</h3>
              <p className="text-gray-600 leading-relaxed">
                Our intelligent system analyzes each student's performance and creates personalized 
                learning paths that adapt in real-time, ensuring optimal understanding and retention.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">CAPS-Aligned Curriculum</h3>
              <p className="text-gray-600 leading-relaxed">
                All content is carefully crafted to align with the South African Curriculum and Assessment 
                Policy Statement (CAPS), ensuring relevance and examination readiness.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Multi-Role Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                Seamlessly connects students, parents, teachers, and tutors in one unified platform, 
                facilitating better communication and collaborative learning experiences.
              </p>
            </motion.div>
          </div>

          {/* Product Screenshots - 3 Row Full-Width Layout */}
          <div className="space-y-8 max-w-7xl mx-auto mt-12">
            {/* Teachers Row */}
            <motion.div
              id="products-teachers"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900">For Teachers</h3>
              </div>
              
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-4">
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Class Performance Analytics</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/teacherClassAnalytics_1763737148859.png", alt: "Teacher Class Analytics" })}>
                      <img 
                        src="/attached_assets/teacherClassAnalytics_1763737148859.png"
                        alt="Teacher Class Analytics"
                        className="w-full h-full object-contain"
                        data-testid="img-teacher-analytics"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Track Assessment Submissions</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/teacherTrackAssesementSubmisions_1763737148860.png", alt: "Teacher Track Submissions" })}>
                      <img 
                        src="/attached_assets/teacherTrackAssesementSubmisions_1763737148860.png"
                        alt="Teacher Track Submissions"
                        className="w-full h-full object-contain"
                        data-testid="img-teacher-submissions"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Create Homework & Assignments</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/teacherHomeWorkCreation_1763737148860.png", alt: "Teacher Homework Creation" })}>
                      <img 
                        src="/attached_assets/teacherHomeWorkCreation_1763737148860.png"
                        alt="Teacher Homework Creation"
                        className="w-full h-full object-contain"
                        data-testid="img-teacher-homework"
                      />
                    </div>
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </motion.div>

            {/* Students Row */}
            <motion.div
              id="products-students"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900">For Students</h3>
              </div>
              
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-4">
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">AI-Powered Grading</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/studentExcerisemarkingReponse_1763726718416.png", alt: "AI Exercise Grading" })}>
                      <img 
                        src="/attached_assets/studentExcerisemarkingReponse_1763726718416.png"
                        alt="AI Exercise Grading"
                        className="w-full h-full object-contain"
                        data-testid="img-student-grading"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Interactive Tutorials</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/studentTutorial_1763726718417.png", alt: "Interactive Tutorial" })}>
                      <img 
                        src="/attached_assets/studentTutorial_1763726718417.png"
                        alt="Interactive Tutorial"
                        className="w-full h-full object-contain"
                        data-testid="img-student-tutorial"
                      />
                    </div>
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </motion.div>

            {/* Parents Row */}
            <motion.div
              id="products-parents"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900">For Parents</h3>
              </div>
              
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-4">
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Student Progress Analysis</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/ParentSutdentProgressView_1763901905910.png", alt: "Parent Student Progress View" })}>
                      <img 
                        src="/attached_assets/ParentSutdentProgressView_1763901905910.png"
                        alt="Parent Student Progress View"
                        className="w-full h-full object-contain"
                        data-testid="img-parent-progress"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Homework & Exercise Tracking</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/ParentViewStudentAssessments_1763901905911.png", alt: "Parent View Student Assessments" })}>
                      <img 
                        src="/attached_assets/ParentViewStudentAssessments_1763901905911.png"
                        alt="Parent View Student Assessments"
                        className="w-full h-full object-contain"
                        data-testid="img-parent-assessments"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="mb-3 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Student List</h4>
                    </div>
                    <div className="w-full md:w-[700px] h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedImage({ src: "/attached_assets/ParentStudentList_1763901905911.png", alt: "Parent Student List" })}>
                      <img 
                        src="/attached_assets/ParentStudentList_1763901905911.png"
                        alt="Parent Student List"
                        className="w-full h-full object-contain"
                        data-testid="img-parent-studentlist"
                      />
                    </div>
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Features Section with Scroll Animations */}
      <section id="features" className="py-20 relative overflow-hidden">
        {/* Multi-layer parallax backgrounds */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y2, 
            willChange: isMobile ? 'auto' : 'transform',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full filter blur-3xl opacity-30"></div>
        </motion.div>
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y5, 
            willChange: isMobile ? 'auto' : 'transform',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-gradient-to-tr from-pink-200 to-orange-200 rounded-full filter blur-3xl opacity-20"></div>
        </motion.div>
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y4, 
            willChange: isMobile ? 'auto' : 'transform',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute top-40 left-1/2 w-64 h-64 bg-gradient-to-bl from-cyan-200 to-blue-200 rounded-full filter blur-2xl opacity-25"></div>
        </motion.div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for a modern, effective learning experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  scale: 1.08, 
                  rotate: index % 2 === 0 ? 2 : -2,
                  y: -10,
                  transition: { duration: 0.3 }
                }}
              >
                <Card className="p-6 h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 bg-white/80 backdrop-blur-sm">
                  <motion.div 
                    className={`w-14 h-14 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
        {/* Multi-layer parallax backgrounds */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y3, 
            willChange: isMobile ? 'auto' : 'transform',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-200 to-pink-200 rounded-full filter blur-3xl opacity-30"></div>
        </motion.div>
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y1, 
            willChange: isMobile ? 'auto' : 'transform',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-bl from-blue-200 to-indigo-200 rounded-full filter blur-3xl opacity-25"></div>
        </motion.div>
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ 
            y: y4, 
            rotate, 
            willChange: isMobile ? 'auto' : 'transform',
            transform: isMobile ? 'translateZ(0)' : undefined,
            backfaceVisibility: 'hidden' as const
          }}
        >
          <div className="absolute bottom-40 right-1/3 w-48 h-48 bg-gradient-to-tr from-yellow-200 to-orange-200 rounded-full filter blur-2xl opacity-20"></div>
        </motion.div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Premium Learning Experience
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-semibold">FREE Subscription for Teachers and Parents. Pricing for Students:</p>
          </motion.div>

          <div className="flex justify-center gap-6 max-w-7xl mx-auto flex-wrap">
            {pricing.filter(plan => ["Physical Science", "Premium Mathematics", "Premium Combo"].includes(plan.name)).map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.7, 
                  delay: index * 0.2,
                  type: "spring",
                  stiffness: 80
                }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -10,
                  rotate: plan.popular ? 0 : (index === 0 ? -2 : index === 2 ? 2 : 0),
                  transition: { duration: 0.3 }
                }}
                className="flex-1 min-w-[280px] max-w-[350px]"
              >
                <Card className={`p-8 h-full relative ${plan.popular ? 'border-2 border-purple-500 shadow-2xl' : 'border border-gray-200'} ${plan.comingSoon ? 'opacity-50 grayscale' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</h3>
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      <span className="text-gray-600 ml-1">{plan.period}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    size="lg"
                    onClick={plan.comingSoon ? showComingSoon : () => setLocation('/home')}
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                    data-testid={`button-getstarted-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {plan.cta}
                    {!plan.comingSoon && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Hear from students, parents, and teachers who are transforming their educational journey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6 h-full bg-white">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  ""
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    J
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">John Doe</p>
                    <p className="text-sm text-gray-600">Parent</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="p-6 h-full bg-white">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  ""
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                    J
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Jane Smith</p>
                    <p className="text-sm text-gray-600">Student</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="p-6 h-full bg-white">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  ""
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-red-400 rounded-full flex items-center justify-center text-white font-bold">
                    R
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Robert Johnson</p>
                    <p className="text-sm text-gray-600">Teacher</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Team Section */}
      <section id="team" className="py-20 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Passionate educators and technologists dedicated to transforming African education
            </p>
          </motion.div>

          <div className="relative max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <ScrollArea ref={scrollAreaRef} className="flex-1 whitespace-nowrap pb-4" type="hover">
              <div className="flex gap-6 px-4 snap-x snap-mandatory">
                {team.map((member, index) => {
                  const isExpanded = expandedBios[member.id];
                  const toggleBio = () => {
                    setExpandedBios(prev => ({
                      ...prev,
                      [member.id]: !prev[member.id]
                    }));
                  };
                  
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ 
                        duration: 0.6, 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 100
                      }}
                      whileHover={{ 
                        scale: 1.02, 
                        y: -5,
                        transition: { duration: 0.3 }
                      }}
                      className="inline-block min-w-[280px] md:min-w-[320px] snap-start"
                    >
                      <Card className="p-6 h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-300 bg-gradient-to-br from-white to-blue-50/30">
                        <div className="text-center">
                          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 p-1">
                            <div className="w-full h-full overflow-hidden rounded-full">
                              <img 
                                src={member.image} 
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <h3 className="text-xl font-bold mb-1 text-gray-900">{member.name}</h3>
                          <p className="text-sm font-semibold text-purple-600 mb-3">{member.role}</p>
                          
                          <motion.div 
                            layout
                            className="text-left whitespace-normal"
                          >
                            <div className={`text-sm text-gray-600 leading-relaxed space-y-2 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                              {member.bio.map((paragraph, i) => (
                                <p key={i}>{paragraph}</p>
                              ))}
                            </div>
                            
                            {member.bio.length > 1 && (
                              <button
                                onClick={toggleBio}
                                aria-expanded={isExpanded}
                                data-testid={`button-readmore-${member.id}`}
                                className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors underline"
                              >
                                {isExpanded ? 'Read less' : 'Read more'}
                              </button>
                            )}
                          </motion.div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            {team.length > 4 && (
              <button 
                onClick={scrollTeamCards}
                className="flex-shrink-0 hover:bg-gray-100 rounded-full p-2 transition-colors"
                aria-label="Scroll team cards"
                data-testid="button-scroll-team"
              >
                <ChevronRight className="w-8 h-8 animate-pulse text-gray-500" />
              </button>
            )}
            </div>
          </div>
        </div>
      </section>
      {/* Request Demo Section */}
      <section id="demo" className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
                Request a Demo
              </h2>
              <p className="text-xl text-white/90 mb-6">
                See XtraClass.ai in action! Schedule a personalized demo for your school or institution.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-white">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">Personalized walkthrough of all features</span>
                </li>
                <li className="flex items-start gap-3 text-white">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">Custom implementation plan for your institution</span>
                </li>
                <li className="flex items-start gap-3 text-white">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">Free trial period to test the platform</span>
                </li>
                <li className="flex items-start gap-3 text-white">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">Dedicated support throughout onboarding</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 bg-white">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Get in Touch</h3>
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  setIsSubmittingDemo(true);

                  const formData = new FormData(form);
                  const data = {
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    institution: formData.get('institution') as string,
                    message: formData.get('message') as string,
                  };

                  try {
                    const response = await fetch(buildApiUrl('/api/demo-request'), {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                      credentials: 'same-origin',
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      toast({
                        title: "Submission Failed",
                        description: error.message || "Please try again later.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const result = await response.json();
                    toast({
                      title: "Request Submitted!",
                      description: result.message || "We'll get back to you within 24 hours.",
                    });
                    form.reset();
                  } catch (error) {
                    console.error('Demo request error:', error);
                    toast({
                      title: "Error",
                      description: "Failed to submit request. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsSubmittingDemo(false);
                  }
                }}>
                  <div>
                    <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      id="demo-name"
                      name="name"
                      type="text"
                      required
                      disabled={isSubmittingDemo}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                      placeholder="John Doe"
                      data-testid="input-demo-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      id="demo-email"
                      name="email"
                      type="email"
                      required
                      disabled={isSubmittingDemo}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                      placeholder="john@school.com"
                      data-testid="input-demo-email"
                    />
                  </div>
                  <div>
                    <label htmlFor="demo-institution" className="block text-sm font-medium text-gray-700 mb-2">
                      School/Institution
                    </label>
                    <input
                      id="demo-institution"
                      name="institution"
                      type="text"
                      disabled={isSubmittingDemo}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                      placeholder="ABC High School"
                      data-testid="input-demo-institution"
                    />
                  </div>
                  <div>
                    <label htmlFor="demo-message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="demo-message"
                      name="message"
                      rows={4}
                      disabled={isSubmittingDemo}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
                      placeholder="Tell us about your needs..."
                      data-testid="textarea-demo-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmittingDemo}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
                    data-testid="button-submit-demo"
                  >
                    {isSubmittingDemo ? 'Submitting...' : 'Request Demo'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of students already learning smarter with XtraClass.ai
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => setLocation('/home')}
                className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6"
                data-testid="button-cta-signup"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                onClick={() => setLocation('/signin')}
                className="border-2 border-white bg-transparent text-white hover:bg-white/20 text-lg px-8 py-6"
                data-testid="button-cta-signin"
              >
                Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Column 1: Logo, Description & Social Media */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImage} alt="XtraClass.ai" className="h-8 brightness-0 invert" />
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Africa's first AI learning platform - transforming education through personalized, adaptive learning.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://x.com/Xtraclass_Ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition"
                  aria-label="Twitter"
                  data-testid="link-twitter"
                >
                  <FaTwitter className="h-5 w-5" />
                </a>
                <a 
                  href="https://www.facebook.com/share/1BW8hmG5ZW/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition"
                  aria-label="Facebook"
                  data-testid="link-facebook"
                >
                  <FaFacebook className="h-5 w-5" />
                </a>
                <a 
                  href="https://www.instagram.com/xtraclass_ai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition"
                  aria-label="Instagram"
                  data-testid="link-instagram"
                >
                  <FaInstagram className="h-5 w-5" />
                </a>
                <a 
                  href="https://www.tiktok.com/@xtraclass_ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition"
                  aria-label="TikTok"
                  data-testid="link-tiktok"
                >
                  <FaTiktok className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Column 2: Product & Company */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#mission" className="hover:text-white transition">Mission</a></li>
                <li><a href="#products" className="hover:text-white transition">Products</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Testimonials</a></li>
                <li><a href="#team" className="hover:text-white transition">Team</a></li>
              </ul>
              <h4 className="font-semibold mb-4 mt-6">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button 
                    onClick={() => { window.scrollTo(0, 0); setLocation('/about'); }} 
                    className="hover:text-white transition text-left"
                  >
                    About
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button 
                    onClick={() => { window.scrollTo(0, 0); setLocation('/privacy'); }} 
                    className="hover:text-white transition text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { window.scrollTo(0, 0); setLocation('/terms'); }} 
                    className="hover:text-white transition text-left"
                  >
                    Terms & Conditions
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact Information */}
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>22 Sloane Street, Bryanston, Sandton, 2191, South Africa</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <a href="tel:+27838712489" className="hover:text-white transition">+27 83 871 2489</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <a href="mailto:info@xtraclass.ai" className="hover:text-white transition">info@xtraclass.ai</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 XtraClass.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden">
          {selectedImage && (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
              <img 
                src={selectedImage.src} 
                alt={selectedImage.alt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
