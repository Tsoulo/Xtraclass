import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  Target, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SubjectInsightCardProps {
  subject: string;
  onViewDetails?: () => void;
  className?: string;
}

export function SubjectInsightCard({ subject, onViewDetails, className }: SubjectInsightCardProps) {
  // Get latest global context
  const { data: context, isLoading, error } = useQuery({
    queryKey: [`/api/student/global-context/${subject}`],
    retry: false,
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'declining':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  if (error || !context) {
    return (
      <Card className={`p-4 border-dashed ${className}`}>
        <div className="text-center text-gray-500">
          <Brain className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium capitalize">{subject}</p>
          <p className="text-xs text-gray-400">No insights yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`} onClick={onViewDetails}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900 capitalize">{subject}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(context.contextDate)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {context.averagePercentage}%
            </div>
            <Badge className={`${getTrendColor(context.overallFeedback.performanceTrend)} border text-xs flex items-center gap-1`}>
              {getTrendIcon(context.overallFeedback.performanceTrend)}
              {context.overallFeedback.performanceTrend}
            </Badge>
          </div>
        </div>

        {/* Key Insight */}
        {context.overallFeedback.keyInsights.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-800 line-clamp-2">
              💡 {context.overallFeedback.keyInsights[0]}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-green-600" />
            <span>{context.overallFeedback.strengths.length} strengths</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{context.totalActivities} activities</span>
          </div>
          {onViewDetails && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
    </Card>
  );
}

export default SubjectInsightCard;