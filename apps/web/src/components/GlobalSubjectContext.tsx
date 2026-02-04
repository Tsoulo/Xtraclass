import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  Target, 
  Lightbulb,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface GlobalContext {
  id: number;
  studentId: number;
  subject: string;
  grade: string;
  contextDate: string;
  overallFeedback: {
    strengths: string[];
    improvements: string[];
    keyInsights: string[];
    performanceTrend: 'improving' | 'stable' | 'declining';
    focusAreas: string[];
    recommendations: string[];
  };
  sourceActivities: Array<{
    type: 'homework' | 'exercise' | 'quiz';
    id: number;
    title: string;
    score: number;
    totalMarks: number;
    percentage: number;
    completedAt: string;
  }>;
  totalActivities: number;
  averageScore: number;
  averagePercentage: number;
  createdAt: string;
  updatedAt: string;
}

interface GlobalSubjectContextProps {
  subject: string;
  className?: string;
}

export function GlobalSubjectContext({ subject, className }: GlobalSubjectContextProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    strengths: true,
    insights: false,
    recommendations: false,
    activities: false
  });

  // Get latest global context
  const { data: latestContext, isLoading } = useQuery({
    queryKey: [`/api/student/global-context/${subject}`],
    retry: false,
  });

  // Get context history
  const { data: contextHistory } = useQuery({
    queryKey: [`/api/student/global-context/${subject}/history`],
    enabled: showHistory,
    retry: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!latestContext) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No global context available yet for {subject}.</p>
          <p className="text-xs text-gray-400 mt-1">
            Complete some homework or exercises to see your overall progress analysis.
          </p>
        </div>
      </Card>
    );
  }

  const context: GlobalContext = latestContext;

  return (
    <div className={className}>
      <Tabs defaultValue="latest" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="latest">Latest Analysis</TabsTrigger>
          <TabsTrigger 
            value="history" 
            onClick={() => setShowHistory(true)}
          >
            Progress History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="space-y-4">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {subject} Overview
                </h3>
                <p className="text-sm text-gray-600">
                  Analysis from {formatDate(context.contextDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${getTrendColor(context.overallFeedback.performanceTrend)} border flex items-center gap-1`}>
                  {getTrendIcon(context.overallFeedback.performanceTrend)}
                  {context.overallFeedback.performanceTrend}
                </Badge>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {context.averagePercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {context.totalActivities} activities
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <div className="text-lg font-semibold text-gray-900">
                  {context.averageScore}
                </div>
                <div className="text-xs text-gray-600">Avg Score</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Target className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-semibold text-gray-900">
                  {context.overallFeedback.strengths.length}
                </div>
                <div className="text-xs text-gray-600">Strengths</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <Lightbulb className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <div className="text-lg font-semibold text-gray-900">
                  {context.overallFeedback.focusAreas.length}
                </div>
                <div className="text-xs text-gray-600">Focus Areas</div>
              </div>
            </div>
          </Card>

          {/* Strengths */}
          <Card className="p-6">
            <Button
              variant="ghost"
              onClick={() => toggleSection('strengths')}
              className="w-full justify-between p-0 h-auto font-medium text-left"
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                <span>Your Strengths ({context.overallFeedback.strengths.length})</span>
              </div>
              {expandedSections.strengths ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {expandedSections.strengths && (
              <div className="mt-4 space-y-2">
                {context.overallFeedback.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{strength}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Key Insights */}
          <Card className="p-6">
            <Button
              variant="ghost"
              onClick={() => toggleSection('insights')}
              className="w-full justify-between p-0 h-auto font-medium text-left"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span>Key Insights ({context.overallFeedback.keyInsights.length})</span>
              </div>
              {expandedSections.insights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {expandedSections.insights && (
              <div className="mt-4 space-y-2">
                {context.overallFeedback.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recommendations */}
          <Card className="p-6">
            <Button
              variant="ghost"
              onClick={() => toggleSection('recommendations')}
              className="w-full justify-between p-0 h-auto font-medium text-left"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <span>Recommendations ({context.overallFeedback.recommendations.length})</span>
              </div>
              {expandedSections.recommendations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {expandedSections.recommendations && (
              <div className="mt-4 space-y-2">
                {context.overallFeedback.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activities */}
          <Card className="p-6">
            <Button
              variant="ghost"
              onClick={() => toggleSection('activities')}
              className="w-full justify-between p-0 h-auto font-medium text-left"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>Recent Activities ({context.sourceActivities.length})</span>
              </div>
              {expandedSections.activities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {expandedSections.activities && (
              <div className="mt-4 space-y-2">
                {context.sourceActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                      <span className="text-sm font-medium">{activity.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {activity.score}/{activity.totalMarks}
                      </span>
                      <Badge 
                        className={`text-xs ${
                          activity.percentage >= 80 ? 'bg-green-100 text-green-700' :
                          activity.percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}
                      >
                        {activity.percentage}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {contextHistory && contextHistory.length > 0 ? (
            <div className="space-y-4">
              {contextHistory.map((historicalContext: GlobalContext, index: number) => (
                <Card key={index} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">{formatDate(historicalContext.contextDate)}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getTrendColor(historicalContext.overallFeedback.performanceTrend)} border text-xs`}>
                        {historicalContext.overallFeedback.performanceTrend}
                      </Badge>
                      <span className="text-sm font-semibold">{historicalContext.averagePercentage}%</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {historicalContext.totalActivities} activities • {historicalContext.overallFeedback.strengths.length} strengths identified
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <div className="text-center text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No historical data available yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Complete more activities to build your progress history.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GlobalSubjectContext;