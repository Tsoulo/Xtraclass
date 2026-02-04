import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, UserCheck, Copy, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function StudentConsentRequest() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get planId from URL params
  const params = new URLSearchParams(window.location.search);
  const planId = parseInt(params.get('planId') || '1');

  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelationship, setParentRelationship] = useState('');
  const [consentLink, setConsentLink] = useState('');
  const [showParentConfirmDialog, setShowParentConfirmDialog] = useState(false);
  const [existingParent, setExistingParent] = useState<any>(null);

  const checkParentMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("/api/subscription/check-parent", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.exists) {
        setExistingParent(data.parent);
        setParentName(`${data.parent.firstName} ${data.parent.lastName}`);
        setParentPhone(data.parent.cellNumber || '');
        setShowParentConfirmDialog(true);
      }
    },
  });

  const handleEmailBlur = () => {
    if (parentEmail && parentEmail.includes('@')) {
      checkParentMutation.mutate(parentEmail);
    }
  };

  const requestParentConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/subscription/request-parent-consent", {
        method: "POST",
        body: JSON.stringify({
          planId,
          parentName,
          parentEmail,
          parentPhone,
          parentRelationship,
        }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      setConsentLink(data.consentUrl);
      toast({
        title: "Consent Request Created",
        description: "Share the link with your parent to complete the subscription.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create consent request",
        variant: "destructive",
      });
    },
  });

  // Redirect if not a student
  if (user?.role !== 'student') {
    setLocation('/subscription');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation('/subscription')}
            className="mb-6"
            data-testid="button-back-to-plans"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>

          {!consentLink ? (
            <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20" data-testid="card-parent-consent-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Parent Consent Required
                </CardTitle>
                <CardDescription>
                  Please provide your parent/guardian's details so they can review and approve your subscription.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="consent-parent-name">
                    Parent/Guardian Full Name
                  </Label>
                  <Input
                    id="consent-parent-name"
                    type="text"
                    placeholder="e.g., John Smith"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    data-testid="input-consent-parent-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consent-parent-email">
                    Parent/Guardian Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="consent-parent-email"
                      type="email"
                      placeholder="parent@example.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      data-testid="input-consent-parent-email"
                    />
                    {checkParentMutation.isPending && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {existingParent && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Parent account found! Details auto-filled.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consent-parent-phone">
                    Parent/Guardian Phone
                  </Label>
                  <Input
                    id="consent-parent-phone"
                    type="tel"
                    placeholder="+27 123 456 789"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    data-testid="input-consent-parent-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consent-parent-relationship">
                    Relationship
                  </Label>
                  <Select value={parentRelationship} onValueChange={setParentRelationship}>
                    <SelectTrigger id="consent-parent-relationship" data-testid="select-parent-relationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setLocation('/subscription')}
                    className="flex-1"
                    data-testid="button-cancel-consent-form"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => requestParentConsentMutation.mutate()}
                    disabled={!parentName || !parentEmail || !parentPhone || !parentRelationship || requestParentConsentMutation.isPending || checkParentMutation.isPending}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    data-testid="button-generate-consent-link"
                  >
                    {requestParentConsentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Generate Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20" data-testid="card-whatsapp-share">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  Share with Parent
                </CardTitle>
                <CardDescription>
                  Send this link to your parent via WhatsApp to complete the subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200" data-testid="alert-email-sent">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300">
                    We've sent an email to <span className="font-semibold">{parentEmail}</span> with the subscription details and consent link.
                  </AlertDescription>
                </Alert>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Consent Link:</p>
                  <div className="flex gap-2">
                    <Input
                      value={consentLink}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-consent-link"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(consentLink);
                        toast({ title: "Copied!", description: "Link copied to clipboard" });
                      }}
                      data-testid="button-copy-link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const whatsappMessage = `Hi! I would like to subscribe to XtraClass.ai. Please review and approve my subscription using this link: ${consentLink}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Share via WhatsApp
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Your parent will need to click the link, review the plan details, and complete the payment.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/subscription')}
                  className="w-full mt-4"
                  data-testid="button-back-to-subscription"
                >
                  Back to Subscription
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Parent Confirmation Dialog */}
      <AlertDialog open={showParentConfirmDialog} onOpenChange={setShowParentConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Parent Account Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              We found an existing parent account with this email. Please confirm these details are correct:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {existingParent && (
            <div className="space-y-3 py-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-semibold">{existingParent.firstName} {existingParent.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="font-semibold">{existingParent.email}</span>
                </div>
                {existingParent.cellNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-semibold">{existingParent.cellNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`font-semibold ${existingParent.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                    {existingParent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  After you confirm, we'll send a subscription request email to this parent.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExistingParent(null);
              setParentName('');
              setParentPhone('');
            }}>
              Not My Parent
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => setShowParentConfirmDialog(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
