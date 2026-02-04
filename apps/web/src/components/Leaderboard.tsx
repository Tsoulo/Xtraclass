import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Crown, 
  Medal, 
  TrendingUp,
  Users,
  Award,
  Zap,
  Star,
  GraduationCap,
  Loader2
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardStudent {
  id: number;
  firstName: string;
  lastName: string;
  grade: string;
  points: number;
  avatar: string;
  subjects: string[];
  rank: number;
  weeklyPoints: number;
}

interface LeaderboardData {
  students: LeaderboardStudent[];
  totalStudents: number;
  filters: {
    grade: string;
    subject: string;
  };
}

export default function Leaderboard() {
  const { user } = useAuth();

  const { data: leaderboardData, isLoading, error } = useQuery<LeaderboardData>({
    queryKey: ['/api/leaderboard'],
    queryFn: async () => {
      // Students see their own grade and subject automatically from backend
      return await apiRequest('/api/leaderboard');
    }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-500" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</div>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatSubjectName = (subject: string) => {
    return subject
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const currentUserData = leaderboardData?.students?.find(student => student.id === user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 pb-20">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              See how you rank against other students and celebrate achievements together!
            </p>
          </div>

          {/* Loading Content */}
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              {/* Spinning loader */}
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              {/* Inner pulsing circle */}
              <div className="absolute inset-2 bg-blue-100 rounded-full animate-pulse"></div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Loading Leaderboard
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Fetching student rankings and achievements...
              </p>
            </div>

            {/* Loading skeleton cards */}
            <div className="w-full max-w-4xl space-y-3 mt-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-grow space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 pb-20">
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Unable to load leaderboard
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error instanceof Error ? error.message : 'Something went wrong'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            See how you rank against other students and celebrate achievements together!
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {leaderboardData?.totalStudents || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Students</div>
            </CardContent>
          </Card>
          
          {currentUserData && (
            <>
              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    #{currentUserData.rank}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Your Rank</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentUserData.points}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Your Points</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentUserData.weeklyPoints}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">This Week</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>Rankings</span>
              {isLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              )}
              {leaderboardData?.filters?.grade !== 'all' && (
                <Badge variant="secondary">Grade {leaderboardData.filters.grade}</Badge>
              )}
              {leaderboardData?.filters?.subject !== 'all' && (
                <Badge variant="secondary">{formatSubjectName(leaderboardData.filters.subject)}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="flex-grow space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                      </div>
                      <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardData?.students?.map((student, index) => (
                <div key={student.id}>
                  <div className={`flex items-center space-x-2 md:space-x-4 p-2 md:p-4 rounded-lg transition-all hover:shadow-md ${
                    student.id === user?.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700' 
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}>
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {getRankIcon(student.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-8 h-8 md:w-12 md:h-12">
                      <AvatarImage src={student.avatar} alt={student.firstName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Student Info */}
                    <div className="flex-grow">
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate" data-testid={`text-student-name-${student.id}`}>
                          {student.username || `${student.firstName}${student.lastName.charAt(0)}`}
                        </h3>
                        {student.id === user?.id && (
                          <Badge variant="outline" className="text-xs hidden sm:block">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 md:space-x-3 mt-1">
                        <div className="flex items-center space-x-1 text-xs md:text-sm text-gray-600 dark:text-gray-300">
                          <GraduationCap className="w-3 h-3 md:w-4 md:h-4" />
                          <span>Grade {student.grade}</span>
                        </div>
                        <div className="hidden sm:flex space-x-1">
                          {student.subjects.map((subject) => (
                            <Badge key={subject} variant="secondary" className="text-xs">
                              {formatSubjectName(subject)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                        {student.points}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">points</div>
                      <div className="hidden sm:flex items-center space-x-1 text-xs text-green-600 dark:text-green-400 mt-1">
                        <Zap className="w-3 h-3" />
                        <span>+{student.weeklyPoints} this week</span>
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <Badge className={`${getRankBadgeColor(student.rank)} font-semibold`}>
                        #{student.rank}
                      </Badge>
                    </div>
                  </div>
                  
                  {index < (leaderboardData?.students?.length || 0) - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}