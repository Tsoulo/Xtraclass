import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  BookOpen,
  Brain,
  Trophy,
  Star,
  Target,
  Zap,
  CheckCircle,
  Calendar,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface CompletedHomework {
  id: number;
  title: string;
  completedAt: string;
  points: number;
}

interface CompletedExercise {
  id: number;
  title: string;
  isTutorial: boolean;
  completedAt: string;
  points: number;
}

interface PointsBreakdown {
  homework: CompletedHomework[];
  exercises: CompletedExercise[];
  totalPoints: number;
  badges: string[];
}

interface PointsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PointsBreakdownModal({ isOpen, onClose }: PointsBreakdownModalProps) {
  const { user } = useAuth();
  const [breakdown, setBreakdown] = useState<PointsBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchPointsBreakdown();
    }
  }, [isOpen, user]);

  const fetchPointsBreakdown = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/api/points-breakdown');
      setBreakdown(data);
    } catch (error) {
      console.error('Error fetching points breakdown:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBadges = (totalPoints: number) => {
    const badges = [];
    if (totalPoints >= 50) badges.push({ name: "First Steps", icon: Target, color: "bg-blue-500" });
    if (totalPoints >= 100) badges.push({ name: "Dedicated Learner", icon: BookOpen, color: "bg-green-500" });
    if (totalPoints >= 200) badges.push({ name: "Knowledge Seeker", icon: Brain, color: "bg-purple-500" });
    if (totalPoints >= 300) badges.push({ name: "Star Student", icon: Star, color: "bg-yellow-500" });
    if (totalPoints >= 500) badges.push({ name: "Academic Champion", icon: Trophy, color: "bg-orange-500" });
    if (totalPoints >= 1000) badges.push({ name: "Master Scholar", icon: Zap, color: "bg-red-500" });
    return badges;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const earnedBadges = breakdown ? getBadges(breakdown.totalPoints) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-yellow-500" />
            <span>Points Breakdown</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            View your complete achievement history and earned badges
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : breakdown ? (
          <div className="space-y-6">
            {/* Total Points Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {breakdown.totalPoints} Points
                </div>
                <div className="text-gray-600">Total Earned</div>
              </div>
            </div>

            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span>Earned Badges</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {earnedBadges.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className={`w-10 h-10 rounded-full ${badge.color} flex items-center justify-center`}>
                        <badge.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{badge.name}</div>
                        <div className="text-sm text-gray-500">Achieved</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Completed Homework */}
            {breakdown.homework.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span>Completed Homework ({breakdown.homework.length})</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {breakdown.homework.map((hw) => (
                    <div
                      key={hw.id}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="font-medium text-gray-800">{hw.title}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(hw.completedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        +{hw.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Exercises */}
            {breakdown.exercises.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span>Completed Exercises ({breakdown.exercises.length})</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {breakdown.exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        exercise.isTutorial 
                          ? 'bg-purple-50 border-purple-100' 
                          : 'bg-green-50 border-green-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="font-medium text-gray-800 flex items-center space-x-2">
                            <span>{exercise.title}</span>
                            {exercise.isTutorial && (
                              <Badge variant="outline" className="text-xs">Tutorial</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(exercise.completedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={
                          exercise.isTutorial 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }
                      >
                        +{exercise.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {breakdown.homework.reduce((sum, hw) => sum + hw.points, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Homework Points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {breakdown.exercises.reduce((sum, ex) => sum + ex.points, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Exercise Points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {breakdown.totalPoints}
                  </div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No points data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}