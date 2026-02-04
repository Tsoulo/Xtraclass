import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Calendar, BookOpen, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface PastPaperSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentGrade: string;
  availableSubjects: Array<{ id: string; name: string; subject?: string }>;
}

function formatSubjectName(subject: string): string {
  return subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function PastPaperSelectionModal({ isOpen, onClose, studentGrade, availableSubjects }: PastPaperSelectionModalProps) {
  const [, setLocation] = useLocation();
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { data: pastPapersData, isLoading: papersLoading } = useQuery<any[]>({
    queryKey: [`/api/past-papers?grade=${studentGrade}`],
    enabled: isOpen
  });
  
  const pastPapers = Array.isArray(pastPapersData) ? pastPapersData : [];

  useEffect(() => {
    if (!isOpen) {
      setSelectedYear('');
      setSelectedSubject('');
      setSelectedPaperId(null);
      setStep('select');
    }
  }, [isOpen]);

  const availableYears: string[] = pastPapers.length > 0 
    ? Array.from(new Set<string>(pastPapers.map((p: any) => String(p.year)))).sort((a, b) => parseInt(b) - parseInt(a))
    : [];

  const subjectsFromPapers: string[] = pastPapers.length > 0
    ? Array.from(new Set<string>(pastPapers.map((p: any) => String(p.subject))))
    : [];

  const studentSubjectIds = availableSubjects.map(s => s.subject || s.id || s.name).filter(Boolean);
  
  const filteredSubjects = subjectsFromPapers.filter((s: string) => 
    studentSubjectIds.some(studentSubject => 
      studentSubject.toLowerCase().includes(s.toLowerCase()) || 
      s.toLowerCase().includes(studentSubject.toLowerCase())
    )
  );

  const displaySubjects = filteredSubjects.length > 0 ? filteredSubjects : subjectsFromPapers;

  const filteredPapers = pastPapers?.filter((p: any) => {
    const matchesYear = !selectedYear || p.year.toString() === selectedYear;
    const matchesSubject = !selectedSubject || p.subject === selectedSubject;
    return matchesYear && matchesSubject && p.extractionStatus === 'completed' && (p.extractedQuestionsCount || 0) > 0;
  }) || [];

  const selectedPaper = pastPapers?.find((p: any) => p.id === selectedPaperId);

  const handleStartAssessment = () => {
    if (selectedPaper) {
      localStorage.setItem('attemptingPastPaper', JSON.stringify({
        id: selectedPaper.id,
        title: selectedPaper.title,
        subject: selectedPaper.subject,
        grade: selectedPaper.grade,
        year: selectedPaper.year,
        paperType: selectedPaper.paperType
      }));
      onClose();
      setLocation('/attempt-past-paper');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-orange-600" />
            Past Paper Assessment
          </DialogTitle>
          <DialogDescription>
            Practice with real exam questions from previous years
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <BookOpen className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Grade {studentGrade} Papers</p>
                <p className="text-xs text-orange-600">Select a year and subject to practice</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year: string) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {displaySubjects.map((subject: string) => (
                      <SelectItem key={subject} value={subject}>{formatSubjectName(subject)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {papersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
              </div>
            ) : filteredPapers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <label className="text-sm font-medium text-slate-700">Available Papers</label>
                {filteredPapers.map((paper: any) => (
                  <Card 
                    key={paper.id} 
                    className={`cursor-pointer transition-all ${selectedPaperId === paper.id ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-slate-50'}`}
                    onClick={() => setSelectedPaperId(paper.id)}
                    data-testid={`paper-card-${paper.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{paper.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {paper.year}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {paper.extractedQuestionsCount} questions
                            </Badge>
                          </div>
                        </div>
                        {selectedPaperId === paper.id && (
                          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (selectedYear || selectedSubject) ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p>No papers found for the selected filters</p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>Select a year or subject to view available papers</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('confirm')} 
                disabled={!selectedPaperId}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-continue"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && selectedPaper && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <ScrollText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{selectedPaper.title}</h3>
                    <p className="text-sm text-slate-600">{formatSubjectName(selectedPaper.subject)} - Grade {selectedPaper.grade}</p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700">
                      {selectedPaper.year}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700">
                      {selectedPaper.extractedQuestionsCount} Questions
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Ready to start?</strong> You'll answer questions from this past paper and receive AI-powered feedback on your responses.
              </p>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button 
                onClick={handleStartAssessment}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                data-testid="button-start-assessment"
              >
                Start Assessment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
