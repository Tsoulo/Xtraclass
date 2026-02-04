import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, AlertCircle, Check } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

export default function ParentConsent() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRecurring, setAcceptRecurring] = useState(false);
  const [acceptAccountCreation, setAcceptAccountCreation] = useState(true);

  const { data: consentData, isLoading, error } = useQuery({
    queryKey: [`/api/subscription/parent-consent/${token}`],
    enabled: !!token,
  });

  // Pre-fill parent details if available
  useEffect(() => {
    if (consentData?.parentDetails) {
      setParentName(consentData.parentDetails.name || "");
      setParentEmail(consentData.parentDetails.email || "");
      setParentPhone(consentData.parentDetails.phone || "");
    }
  }, [consentData]);

  const confirmConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(buildApiUrl(`/api/subscription/parent-consent/${token}/confirm`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          parentEmail,
          parentPhone,
          billingAddress,
          acceptTerms,
          acceptRecurring,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm consent");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm consent",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "NGN") {
      return `₦${(amount / 100).toLocaleString()}`;
    }
    if (currency === "ZAR") {
      return `R${(amount / 100).toLocaleString()}`;
    }
    return `${currency} ${(amount / 100).toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !consentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invalid or Expired Link
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              This consent link is no longer valid. Please contact your child to request a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Parent Consent Required
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your child has requested a subscription to XtraClass.ai
          </p>
        </div>

        <Card className="mb-6 border-indigo-200">
          <CardHeader className="bg-indigo-50 dark:bg-indigo-950/20">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Student Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {consentData.student.firstName} {consentData.student.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Student Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {consentData.student.email}
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {consentData.plan.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Price</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(consentData.plan.amount, consentData.plan.currency)} / {consentData.plan.interval}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                {consentData.plan.description}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirm Your Details</CardTitle>
            <CardDescription>
              Please verify your information and authorize the subscription payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parent-name">Full Name *</Label>
              <Input
                id="parent-name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Your full name"
                data-testid="input-parent-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-email">Email Address *</Label>
              <Input
                id="parent-email"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="your.email@example.com"
                data-testid="input-parent-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-phone">Phone Number *</Label>
              <Input
                id="parent-phone"
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+27 123 456 789"
                data-testid="input-parent-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-address">Billing Address</Label>
              <Input
                id="billing-address"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="123 Street, City, Country"
                data-testid="input-billing-address"
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-account-creation"
                  checked={acceptAccountCreation}
                  onCheckedChange={(checked) => setAcceptAccountCreation(checked as boolean)}
                  data-testid="checkbox-accept-account-creation"
                />
                <Label htmlFor="accept-account-creation" className="text-sm leading-relaxed cursor-pointer">
                  I consent to an account being created for me to manage my child's subscription and monitor their academic progress
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  data-testid="checkbox-accept-terms"
                />
                <Label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
                  I confirm that I am the legal parent/guardian of this student and I accept the Terms & Conditions and Privacy Policy
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-recurring"
                  checked={acceptRecurring}
                  onCheckedChange={(checked) => setAcceptRecurring(checked as boolean)}
                  data-testid="checkbox-accept-recurring"
                />
                <Label htmlFor="accept-recurring" className="text-sm leading-relaxed cursor-pointer">
                  I authorize recurring payments for this subscription according to the selected billing cycle
                </Label>
              </div>
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 mt-6"
              onClick={() => confirmConsentMutation.mutate()}
              disabled={
                !parentName ||
                !parentEmail ||
                !parentPhone ||
                !acceptTerms ||
                !acceptRecurring ||
                confirmConsentMutation.isPending
              }
              data-testid="button-proceed-payment"
            >
              {confirmConsentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
