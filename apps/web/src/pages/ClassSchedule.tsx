import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Plus, BookOpen, Users, Edit, Trash2, Loader2, Video, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useClasses } from "@/hooks/useClasses";
import { TranscriptViewer } from "@/components/TranscriptViewer";

interface ClassScheduleProps {
  classId: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  day: string;
  type: "lesson" | "test" | "assignment";
  room?: string;
  description?: string;
  videoLink?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  grade: string;
  studentCount: number;
}

interface LessonData {
  id: number;
  date: string;
  lessonTitle: string;
  description?: string;
  duration?: number;
  videoLink?: string;
  grade: string;
  subject: string;
}

export default function ClassSchedule({ classId }: ClassScheduleProps) {
  const [, setLocation] = useLocation();
  const [selectedWeek, setSelectedWeek] = useState(0);

  // Get class info from classes hook
  const { data: classes, isLoading: classesLoading } = useClasses();
  const classInfo = classes?.find(c => c.id === parseInt(classId));

  // Fetch lessons for this class's grade and subject
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', classInfo?.grade, classInfo?.subject],
    queryFn: async () => {
      if (!classInfo?.grade || !classInfo?.subject) return [];
      
      // Get current week's date range for lessons
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      
      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/syllabus-calendar?startDate=${startDate}&endDate=${endDate}&grade=${encodeURIComponent(classInfo.grade)}&subject=${encodeURIComponent(classInfo.subject)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch lessons: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!classInfo?.grade && !!classInfo?.subject
  });

  // Convert lessons to schedule items format
  const scheduleItems: ScheduleItem[] = lessons.map((lesson: any) => {
    const lessonDate = new Date(lesson.date);
    const dayName = lessonDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    return {
      id: lesson.id.toString(),
      title: lesson.lessonTitle || 'Untitled Lesson',
      subject: classInfo?.subject || '',
      startTime: "09:00", // Default time - could be enhanced with actual lesson times
      endTime: lesson.duration ? `${9 + Math.floor(lesson.duration / 60)}:${(lesson.duration % 60).toString().padStart(2, '0')}` : "10:00",
      day: dayName,
      type: "lesson",
      room: "Classroom",
      description: lesson.description || '',
      videoLink: lesson.videoLink
    };
  });

  if (classesLoading || lessonsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Class not found</p>
          <Button onClick={() => setLocation('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = [
    "08:00 - 09:00",
    "09:00 - 10:00", 
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00"
  ];

  const getScheduleItemForSlot = (day: string, timeSlot: string) => {
    const [startTime] = timeSlot.split(" - ");
    return scheduleItems.find(item => 
      item.day === day && item.startTime === startTime
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lesson": return "bg-blue-100 text-blue-800 border-blue-200";
      case "test": return "bg-red-100 text-red-800 border-red-200";
      case "assignment": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getVideoThumbnail = (videoUrl: string) => {
    if (!videoUrl) return null;
    
    // YouTube thumbnail extraction
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      let videoId = '';
      if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = videoUrl.split('v=')[1]?.split('&')[0];
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }
    
    // Vimeo thumbnail would require API call, so we'll show a placeholder
    if (videoUrl.includes('vimeo.com')) {
      return null; // Could implement Vimeo thumbnail API if needed
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 md:pt-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30"
              >
                <Calendar className="w-5 h-5 text-white" />
              </Button>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Class Schedule</h1>
            <p className="text-white/80 text-lg">{classInfo.name} • Grade {classInfo.grade}</p>
            <p className="text-white/60">{classInfo.subject}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-8 px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Today's Lessons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Today's Lessons
              </CardTitle>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduleItems
                  .filter(item => {
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    return item.day === today;
                  })
                  .map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{lesson.title}</h4>
                        <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.startTime} - {lesson.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {lesson.room}
                          </span>
                          {lesson.videoLink && (
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              Video Available
                            </span>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-gray-500 mt-2">{lesson.description}</p>
                        )}
                        
                        {/* Video Thumbnail */}
                        {lesson.videoLink && (
                          <div className="mt-3">
                            {getVideoThumbnail(lesson.videoLink) ? (
                              <div className="relative group cursor-pointer" onClick={() => window.open(lesson.videoLink, '_blank')}>
                                <img 
                                  src={getVideoThumbnail(lesson.videoLink) || undefined} 
                                  alt="Video thumbnail"
                                  className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-12 h-12 bg-black bg-opacity-70 rounded-full flex items-center justify-center group-hover:bg-opacity-80 transition-all">
                                    <Play className="w-6 h-6 text-white ml-1" />
                                  </div>
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                  Video Lesson
                                </div>
                              </div>
                            ) : (
                              <div className="w-full max-w-xs h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border border-gray-200 flex items-center justify-center cursor-pointer hover:from-blue-200 hover:to-purple-200 transition-all"
                                   onClick={() => window.open(lesson.videoLink, '_blank')}>
                                <div className="text-center">
                                  <Video className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                  <p className="text-sm font-medium text-gray-700">Video Lesson</p>
                                  <p className="text-xs text-gray-500">Click to watch</p>
                                </div>
                              </div>
                            )}
                            <div className="mt-2">
                              <TranscriptViewer 
                                videoUrl={lesson.videoLink} 
                                lessonTitle={lesson.title}
                                lessonId={parseInt(lesson.id)}
                                subject={classInfo?.subject}
                                grade={classInfo?.grade}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(lesson.type)}>
                          {lesson.type}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                {scheduleItems.filter(item => {
                  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  return item.day === today;
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No lessons scheduled for today</p>
                    <p className="text-sm mt-2">
                      Showing lessons for Grade {classInfo.grade} {classInfo.subject}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Controls */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Weekly Schedule
                </CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule Item
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Schedule Grid */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-6 gap-2">
                {/* Header Row */}
                <div className="text-center text-sm font-medium text-gray-600 p-2">Time</div>
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 p-2">
                    {day}
                  </div>
                ))}

                {/* Time Slots */}
                {timeSlots.map((timeSlot, timeIndex) => (
                  <React.Fragment key={`time-row-${timeIndex}`}>
                    <div className="text-xs text-gray-500 p-2 border-r">
                      {timeSlot}
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const scheduleItem = getScheduleItemForSlot(day, timeSlot);
                      const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                      
                      return (
                        <div 
                          key={`${day}-${timeSlot}-${dayIndex}`} 
                          className={`p-1 border border-gray-100 min-h-[60px] ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                        >
                          {scheduleItem ? (
                            <div className={`p-2 rounded text-xs ${getTypeColor(scheduleItem.type)} cursor-pointer hover:shadow-sm transition-shadow ${isToday ? 'ring-2 ring-blue-300' : ''}`}>
                              <div className="font-medium">{scheduleItem.title}</div>
                              <div className="text-xs opacity-75 flex items-center gap-1">
                                <span>{scheduleItem.room}</span>
                                {scheduleItem.videoLink && (
                                  <Video className="h-2 w-2" />
                                )}
                              </div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {scheduleItem.type}
                              </Badge>
                            </div>
                          ) : (
                            <div className="w-full h-full rounded border-dashed border-2 border-gray-200 hover:border-gray-300 cursor-pointer flex items-center justify-center text-gray-400 hover:text-gray-500 transition-colors">
                              <Plus className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lessons</span>
                    <span className="font-medium">{scheduleItems.filter(item => item.type === 'lesson').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tests</span>
                    <span className="font-medium">{scheduleItems.filter(item => item.type === 'test').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Items</span>
                    <span className="font-medium">{scheduleItems.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-green-600" />
                  Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average</span>
                    <span className="font-medium text-green-600">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Lesson</span>
                    <span className="font-medium">16/18</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <div className="font-medium">Algebra Test</div>
                    <div className="text-gray-600">Wednesday 10:00</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">Homework Review</div>
                    <div className="text-gray-600">Friday 14:00</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}