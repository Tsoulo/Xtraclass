import { Button } from "@/components/ui/button";
import { Home, BarChart3, MessageCircle, Calendar, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Fetch conversations to get unread message count
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/chat/conversations'],
    queryFn: () => apiRequest('/api/chat/conversations'),
    enabled: isAuthenticated && !!user,
    refetchInterval: 10000, // Refetch every 10 seconds for faster updates
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });

  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((total: number, conversation: any) => {
    return total + (conversation.unreadCount || 0);
  }, 0);

  const handleNavigation = (path: string) => {
    // Store current location as previous route for back navigation
    localStorage.setItem('previousRoute', location);
    
    // Handle home navigation - force navigation to dashboard
    if (path === "/dashboard") {
      console.log('🏠 Home clicked - Current location:', location);
      console.log('🏠 Navigating to:', '/dashboard');
      setLocation('/dashboard');
      return;
    }
    
    // Handle analytics navigation based on user role
    if (path === "/analytics") {
      // Use authenticated user role instead of localStorage for more reliability
      const userRole = user?.role || localStorage.getItem('userRole');
      if (userRole === 'teacher') {
        setLocation('/analytics');
        return;
      } else if (userRole === 'parent') {
        setLocation('/parent-analytics');
        return;
      } else {
        // Students and others go to leaderboard
        setLocation('/leaderboard');
        return;
      }
    }
    
    // Handle studies navigation based on user role
    if (path === "/subject-details") {
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'parent') {
        setLocation('/parent-analytics');
        return;
      }
    }
    
    // Handle calendar navigation based on user role
    if (path === "/calendar") {
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'student') {
        setLocation('/student-calendar');
        return;
      }
    }
    
    // Handle settings navigation based on user role
    if (path === "/settings") {
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'parent') {
        setLocation('/parent-settings');
        return;
      } else if (userRole === 'student') {
        setLocation('/student-settings');
        return;
      }
    }
    
    setLocation(path);
  };

  // Get the appropriate label for analytics/leaderboard based on user role
  const getAnalyticsLabel = () => {
    const userRole = user?.role || localStorage.getItem('userRole');
    if (userRole === 'student') {
      return "Leaderboard";
    }
    return "Analytics"; // For parents and teachers
  };

  const navItems = [
    { 
      id: "home", 
      icon: Home, 
      label: "Home", 
      path: "/dashboard", 
      activePaths: ["/dashboard", "/add-children", "/view-class"],
      activePattern: /^\/dashboard($|\/student\/)/
    },
    { 
      id: "analytics", 
      icon: BarChart3, 
      label: getAnalyticsLabel(), 
      path: "/analytics", 
      activePaths: ["/analytics", "/leaderboard"],
      activePattern: /^\/analytics/
    },
    { 
      id: "messages", 
      icon: MessageCircle, 
      label: "Messages", 
      path: "/messages", 
      badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined, 
      activePaths: ["/messages"],
      activePattern: /^\/messages/
    },
    { 
      id: "calendar", 
      icon: Calendar, 
      label: "Calendar", 
      path: "/calendar", 
      activePaths: ["/calendar", "/student-calendar"],
      activePattern: /^\/(calendar|student-calendar)/
    },
    { 
      id: "settings", 
      icon: Settings, 
      label: "Settings", 
      path: "/settings", 
      activePaths: ["/settings", "/parent-settings"],
      activePattern: /^\/(settings|parent-settings)/
    },
  ];

  return (
    <div className="fixed md:top-0 bottom-0 md:bottom-auto left-0 right-0 bg-white border-t md:border-t-0 md:border-b border-gray-200 z-40">
      <div className="flex justify-around py-2 md:py-3">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const userRole = localStorage.getItem('userRole');
          
          // Special handling for Home button based on user role
          let isActive = item.activePaths.includes(location) || 
                        item.activePattern.test(location) || 
                        location.startsWith(item.path);
          
          // For parents, highlight Home when on dashboard or add-children page
          if (item.id === 'home' && userRole === 'parent' && (location === '/dashboard' || location === '/add-children')) {
            isActive = true;
          }
          
          // For teachers, highlight Home when on dashboard or student pages
          if (item.id === 'home' && userRole === 'teacher' && (location === '/dashboard' || location.startsWith('/dashboard/student/'))) {
            isActive = true;
          }
          
          // For teachers, highlight Analytics when on analytics or leaderboard
          if (item.id === 'analytics' && userRole === 'teacher' && (location === '/analytics' || location === '/leaderboard')) {
            isActive = true;
          }
          
          // For non-teachers, highlight Analytics when on leaderboard
          if (item.id === 'analytics' && userRole !== 'teacher' && location === '/leaderboard') {
            isActive = true;
          }
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col md:flex-row md:gap-2 items-center py-2 px-3 relative transition-all duration-200 ${
                isActive 
                  ? "text-primary bg-primary/10 rounded-xl" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <IconComponent className="w-6 h-6 mb-1 md:mb-0" />
              <span className="hidden sm:block text-xs md:text-sm font-medium">{item.label}</span>
              {item.badge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{item.badge}</span>
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
