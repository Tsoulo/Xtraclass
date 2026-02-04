import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, DollarSign, Plus, Edit, Trash2, Save, Loader2, Users, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  paystackPlanCode: string;
  amount: number;
  currency: string;
  interval: string;
  features: {
    maxStudents?: number;
    maxClasses?: number;
    aiChatAccess?: boolean;
    advancedAnalytics?: boolean;
    prioritySupport?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
    [key: string]: any;
  };
  isActive: boolean;
  sortOrder: number;
}

interface Subscriber {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  status: string;
  planId: number;
  amount: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextPaymentDate: string | null;
  trialEndDate: string | null;
  paystackSubscriptionCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const defaultNewPlan = {
  name: "",
  description: "",
  paystackPlanCode: "",
  amount: 0,
  currency: "ZAR",
  interval: "monthly",
  isActive: true,
  features: {
    aiChatAccess: true,
    advancedAnalytics: true,
    prioritySupport: true,
    customBranding: false,
    apiAccess: false,
    tutorVideoCall: false,
    aiVoiceTutor: false,
  },
};

export default function AdminSubscriptionSettings() {
  const [requirePremium, setRequirePremium] = useState(false);
  const [trialPeriodDays, setTrialPeriodDays] = useState(0);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showAddPlanDialog, setShowAddPlanDialog] = useState(false);
  const [showEditPlanDialog, setShowEditPlanDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [newPlan, setNewPlan] = useState(defaultNewPlan);
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<{
    requirePremium?: boolean;
    trialPeriodDays?: number;
  }>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: subscribersData, isLoading: subscribersLoading } = useQuery<{
    total: number;
    subscribers: Subscriber[];
  }>({
    queryKey: ["/api/admin/subscribers"],
  });

  useEffect(() => {
    if (settings) {
      setRequirePremium(settings.requirePremium || false);
      setTrialPeriodDays(settings.trialPeriodDays || 0);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { requirePremium?: boolean; trialPeriodDays?: number }) => {
      return await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings Updated",
        description: "Subscription settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      requirePremium,
      trialPeriodDays,
    });
  };

  const createPlanMutation = useMutation({
    mutationFn: async (planData: typeof newPlan) => {
      return await apiRequest("/api/subscription-plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setShowAddPlanDialog(false);
      setNewPlan(defaultNewPlan);
      toast({
        title: "Plan Created",
        description: "New subscription plan has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Plan",
        description: error.message || "Failed to create subscription plan",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = () => {
    if (!newPlan.name || !newPlan.paystackPlanCode || newPlan.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Paystack Code, Amount)",
        variant: "destructive",
      });
      return;
    }
    createPlanMutation.mutate(newPlan);
  };

  const updatePlanMutation = useMutation({
    mutationFn: async (planData: SubscriptionPlan) => {
      return await apiRequest(`/api/subscription-plans/${planData.id}`, {
        method: "PUT",
        body: JSON.stringify(planData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setShowEditPlanDialog(false);
      setEditingPlan(null);
      toast({
        title: "Plan Updated",
        description: "Subscription plan has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Plan",
        description: error.message || "Failed to update subscription plan",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      return await apiRequest(`/api/subscription-plans/${planId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
      toast({
        title: "Plan Deleted",
        description: "Subscription plan has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Plan",
        description: error.message || "Failed to delete subscription plan",
        variant: "destructive",
      });
    },
  });

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan({ ...plan });
    setShowEditPlanDialog(true);
  };

  const handleUpdatePlan = () => {
    if (!editingPlan) return;
    if (!editingPlan.name || !editingPlan.paystackPlanCode || editingPlan.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Paystack Code, Amount)",
        variant: "destructive",
      });
      return;
    }
    updatePlanMutation.mutate(editingPlan);
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePlan = () => {
    if (planToDelete) {
      deletePlanMutation.mutate(planToDelete.id);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "NGN") {
      return `₦${(amount / 100).toFixed(2)}`;
    }
    return `${currency} ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (settingsLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure premium access, trial periods, and subscription plans
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-premium-access">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Premium Access Control
            </CardTitle>
            <CardDescription>
              Enable or disable premium subscription requirement for the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="require-premium" data-testid="label-premium-toggle">
                  Require Premium Subscription
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  When enabled, users must have an active subscription to access the platform
                </p>
              </div>
              <Switch
                id="require-premium"
                checked={requirePremium}
                onCheckedChange={setRequirePremium}
                data-testid="switch-premium-toggle"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="trial-period" data-testid="label-trial-period">
                Trial Period (Days)
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Number of days new subscribers get free access
              </p>
              <Select
                value={trialPeriodDays.toString()}
                onValueChange={(value) => setTrialPeriodDays(parseInt(value))}
              >
                <SelectTrigger id="trial-period" data-testid="select-trial-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Trial</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days (1 Month)</SelectItem>
                  <SelectItem value="60">60 Days (2 Months)</SelectItem>
                  <SelectItem value="90">90 Days (3 Months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-current-status">
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>Overview of subscription configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Premium Mode:</span>
                <Badge variant={requirePremium ? "default" : "secondary"} data-testid="badge-premium-status">
                  {requirePremium ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Trial Period:</span>
                <Badge variant="outline" data-testid="badge-trial-period">
                  {trialPeriodDays === 0 ? "No Trial" : `${trialPeriodDays} Days`}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Plans:</span>
                <Badge variant="outline" data-testid="badge-active-plans">
                  {plans?.filter((p) => p.isActive).length || 0}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Impact:</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                {requirePremium ? (
                  <>
                    <li>Users need active subscription</li>
                    <li>New users get {trialPeriodDays} day{trialPeriodDays !== 1 ? 's' : ''} trial</li>
                    <li>Admins always have access</li>
                  </>
                ) : (
                  <>
                    <li>All users have free access</li>
                    <li>No subscription required</li>
                    <li>Trial settings inactive</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-subscription-plans">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Subscription Plans
              </CardTitle>
              <CardDescription>Manage pricing tiers and features</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddPlanDialog(true)}
              data-testid="button-add-plan"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!plans || plans.length === 0 ? (
            <div className="text-center py-12 text-gray-500" data-testid="text-no-plans">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subscription plans configured yet</p>
              <p className="text-sm mt-2">Create plans in Paystack dashboard first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors"
                  data-testid={`plan-${plan.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg" data-testid={`text-plan-name-${plan.id}`}>
                          {plan.name}
                        </h3>
                        <Badge variant={plan.isActive ? "default" : "secondary"} data-testid={`badge-plan-status-${plan.id}`}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {plan.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium" data-testid={`text-plan-price-${plan.id}`}>
                          {formatCurrency(plan.amount, plan.currency)} / {plan.interval}
                        </span>
                        <span className="text-gray-500">
                          Code: {plan.paystackPlanCode}
                        </span>
                      </div>
                      {plan.features && Object.keys(plan.features).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {plan.features.maxStudents && (
                            <Badge variant="outline" className="text-xs">
                              {plan.features.maxStudents} Students
                            </Badge>
                          )}
                          {plan.features.maxClasses && (
                            <Badge variant="outline" className="text-xs">
                              {plan.features.maxClasses} Classes
                            </Badge>
                          )}
                          {plan.features.aiChatAccess && (
                            <Badge variant="outline" className="text-xs">
                              AI Chat
                            </Badge>
                          )}
                          {plan.features.advancedAnalytics && (
                            <Badge variant="outline" className="text-xs">
                              Advanced Analytics
                            </Badge>
                          )}
                          {plan.features.prioritySupport && (
                            <Badge variant="outline" className="text-xs">
                              Priority Support
                            </Badge>
                          )}
                          {plan.features.customBranding && (
                            <Badge variant="outline" className="text-xs">
                              Custom Branding
                            </Badge>
                          )}
                          {plan.features.apiAccess && (
                            <Badge variant="outline" className="text-xs">
                              API Access
                            </Badge>
                          )}
                          {plan.features.tutorVideoCall && (
                            <Badge variant="outline" className="text-xs">
                              Tutor Video Call
                            </Badge>
                          )}
                          {plan.features.aiVoiceTutor && (
                            <Badge variant="outline" className="text-xs">
                              Tsebo Voice Tutor
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditPlan(plan)}
                        data-testid={`button-edit-plan-${plan.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeletePlan(plan)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-plan-${plan.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-subscribers-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Subscribers
              </CardTitle>
              <CardDescription>List of all users with active subscriptions</CardDescription>
            </div>
            <Badge variant="outline" data-testid="badge-total-subscribers">
              {subscribersData?.total || 0} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {subscribersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !subscribersData?.subscribers || subscribersData.subscribers.length === 0 ? (
            <div className="text-center py-12 text-gray-500" data-testid="text-no-subscribers">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active subscribers yet</p>
              <p className="text-sm mt-2">Subscribers will appear here once users subscribe</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>Next Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribersData.subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id} data-testid={`subscriber-row-${subscriber.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-subscriber-name-${subscriber.id}`}>
                            {subscriber.userName}
                          </div>
                          <div className="text-sm text-gray-500" data-testid={`text-subscriber-email-${subscriber.id}`}>
                            {subscriber.userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-subscriber-role-${subscriber.id}`}>
                          {subscriber.userRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={subscriber.status === 'active' ? 'default' : subscriber.status === 'trial' ? 'secondary' : 'destructive'}
                          data-testid={`badge-subscriber-status-${subscriber.id}`}
                        >
                          {subscriber.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-subscriber-amount-${subscriber.id}`}>
                        {formatCurrency(subscriber.amount, subscriber.currency)}
                      </TableCell>
                      <TableCell data-testid={`text-subscriber-period-end-${subscriber.id}`}>
                        {formatDate(subscriber.currentPeriodEnd)}
                      </TableCell>
                      <TableCell data-testid={`text-subscriber-next-payment-${subscriber.id}`}>
                        {formatDate(subscriber.nextPaymentDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddPlanDialog} onOpenChange={setShowAddPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Subscription Plan</DialogTitle>
            <DialogDescription>
              Create a new subscription plan. Make sure you've already created the plan in Paystack dashboard first.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan Name *</Label>
                <Input
                  id="plan-name"
                  placeholder="e.g., Premium"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  data-testid="input-plan-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paystack-code">Paystack Plan Code *</Label>
                <Input
                  id="paystack-code"
                  placeholder="e.g., PLN_premium_monthly"
                  value={newPlan.paystackPlanCode}
                  onChange={(e) => setNewPlan({ ...newPlan, paystackPlanCode: e.target.value })}
                  data-testid="input-paystack-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Plan description..."
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                data-testid="input-plan-description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (in cents) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g., 20000 for R200"
                  value={newPlan.amount || ""}
                  onChange={(e) => setNewPlan({ ...newPlan, amount: parseInt(e.target.value) || 0 })}
                  data-testid="input-plan-amount"
                />
                <p className="text-xs text-gray-500">
                  {newPlan.amount > 0 ? `= ${newPlan.currency} ${(newPlan.amount / 100).toFixed(2)}` : "Enter amount in cents"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={newPlan.currency}
                  onValueChange={(value) => setNewPlan({ ...newPlan, currency: value })}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR (South African Rand)</SelectItem>
                    <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Billing Interval</Label>
                <Select
                  value={newPlan.interval}
                  onValueChange={(value) => setNewPlan({ ...newPlan, interval: value })}
                >
                  <SelectTrigger data-testid="select-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Plan Features</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai-chat"
                    checked={newPlan.features.aiChatAccess}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, aiChatAccess: checked as boolean }
                    })}
                    data-testid="checkbox-ai-chat"
                  />
                  <Label htmlFor="ai-chat" className="text-sm font-normal">AI Chat Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="analytics"
                    checked={newPlan.features.advancedAnalytics}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, advancedAnalytics: checked as boolean }
                    })}
                    data-testid="checkbox-analytics"
                  />
                  <Label htmlFor="analytics" className="text-sm font-normal">Advanced Analytics</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="priority-support"
                    checked={newPlan.features.prioritySupport}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, prioritySupport: checked as boolean }
                    })}
                    data-testid="checkbox-priority-support"
                  />
                  <Label htmlFor="priority-support" className="text-sm font-normal">Priority Support</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="custom-branding"
                    checked={newPlan.features.customBranding}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, customBranding: checked as boolean }
                    })}
                    data-testid="checkbox-custom-branding"
                  />
                  <Label htmlFor="custom-branding" className="text-sm font-normal">Custom Branding</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="api-access"
                    checked={newPlan.features.apiAccess}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, apiAccess: checked as boolean }
                    })}
                    data-testid="checkbox-api-access"
                  />
                  <Label htmlFor="api-access" className="text-sm font-normal">API Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tutor-video-call"
                    checked={newPlan.features.tutorVideoCall}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, tutorVideoCall: checked as boolean }
                    })}
                    data-testid="checkbox-tutor-video-call"
                  />
                  <Label htmlFor="tutor-video-call" className="text-sm font-normal">Tutor Video Call</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai-voice-tutor"
                    checked={newPlan.features.aiVoiceTutor}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      features: { ...newPlan.features, aiVoiceTutor: checked as boolean }
                    })}
                    data-testid="checkbox-ai-voice-tutor"
                  />
                  <Label htmlFor="ai-voice-tutor" className="text-sm font-normal">Tsebo Voice Tutor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-active"
                    checked={newPlan.isActive}
                    onCheckedChange={(checked) => setNewPlan({
                      ...newPlan,
                      isActive: checked as boolean
                    })}
                    data-testid="checkbox-is-active"
                  />
                  <Label htmlFor="is-active" className="text-sm font-normal">Active Plan</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddPlanDialog(false);
                setNewPlan(defaultNewPlan);
              }}
              data-testid="button-cancel-add-plan"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending}
              data-testid="button-save-plan"
            >
              {createPlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditPlanDialog} onOpenChange={setShowEditPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan details. Changes will apply to new subscribers.
            </DialogDescription>
          </DialogHeader>
          
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-name">Plan Name *</Label>
                  <Input
                    id="edit-plan-name"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    data-testid="input-edit-plan-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paystack-code">Paystack Plan Code *</Label>
                  <Input
                    id="edit-paystack-code"
                    value={editingPlan.paystackPlanCode}
                    onChange={(e) => setEditingPlan({ ...editingPlan, paystackPlanCode: e.target.value })}
                    data-testid="input-edit-paystack-code"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingPlan.description || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  data-testid="input-edit-plan-description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount (in cents) *</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={editingPlan.amount || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, amount: parseInt(e.target.value) || 0 })}
                    data-testid="input-edit-plan-amount"
                  />
                  <p className="text-xs text-gray-500">
                    {editingPlan.amount > 0 ? `= ${editingPlan.currency} ${(editingPlan.amount / 100).toFixed(2)}` : "Enter amount in cents"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Select
                    value={editingPlan.currency}
                    onValueChange={(value) => setEditingPlan({ ...editingPlan, currency: value })}
                  >
                    <SelectTrigger data-testid="select-edit-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR (South African Rand)</SelectItem>
                      <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-interval">Billing Interval</Label>
                  <Select
                    value={editingPlan.interval}
                    onValueChange={(value) => setEditingPlan({ ...editingPlan, interval: value })}
                  >
                    <SelectTrigger data-testid="select-edit-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Plan Features</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-ai-chat"
                      checked={editingPlan.features?.aiChatAccess || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, aiChatAccess: checked as boolean }
                      })}
                      data-testid="checkbox-edit-ai-chat"
                    />
                    <Label htmlFor="edit-ai-chat" className="text-sm font-normal">AI Chat Access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-analytics"
                      checked={editingPlan.features?.advancedAnalytics || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, advancedAnalytics: checked as boolean }
                      })}
                      data-testid="checkbox-edit-analytics"
                    />
                    <Label htmlFor="edit-analytics" className="text-sm font-normal">Advanced Analytics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-priority-support"
                      checked={editingPlan.features?.prioritySupport || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, prioritySupport: checked as boolean }
                      })}
                      data-testid="checkbox-edit-priority-support"
                    />
                    <Label htmlFor="edit-priority-support" className="text-sm font-normal">Priority Support</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-custom-branding"
                      checked={editingPlan.features?.customBranding || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, customBranding: checked as boolean }
                      })}
                      data-testid="checkbox-edit-custom-branding"
                    />
                    <Label htmlFor="edit-custom-branding" className="text-sm font-normal">Custom Branding</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-api-access"
                      checked={editingPlan.features?.apiAccess || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, apiAccess: checked as boolean }
                      })}
                      data-testid="checkbox-edit-api-access"
                    />
                    <Label htmlFor="edit-api-access" className="text-sm font-normal">API Access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-tutor-video-call"
                      checked={editingPlan.features?.tutorVideoCall || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, tutorVideoCall: checked as boolean }
                      })}
                      data-testid="checkbox-edit-tutor-video-call"
                    />
                    <Label htmlFor="edit-tutor-video-call" className="text-sm font-normal">Tutor Video Call</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-ai-voice-tutor"
                      checked={editingPlan.features?.aiVoiceTutor || false}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        features: { ...editingPlan.features, aiVoiceTutor: checked as boolean }
                      })}
                      data-testid="checkbox-edit-ai-voice-tutor"
                    />
                    <Label htmlFor="edit-ai-voice-tutor" className="text-sm font-normal">Tsebo Voice Tutor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-is-active"
                      checked={editingPlan.isActive}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        isActive: checked as boolean
                      })}
                      data-testid="checkbox-edit-is-active"
                    />
                    <Label htmlFor="edit-is-active" className="text-sm font-normal">Active Plan</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPlanDialog(false);
                setEditingPlan(null);
              }}
              data-testid="button-cancel-edit-plan"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePlan}
              disabled={updatePlanMutation.isPending}
              data-testid="button-update-plan"
            >
              {updatePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{planToDelete?.name}" plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPlanToDelete(null);
              }}
              data-testid="button-cancel-delete-plan"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePlan}
              disabled={deletePlanMutation.isPending}
              data-testid="button-confirm-delete-plan"
            >
              {deletePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
