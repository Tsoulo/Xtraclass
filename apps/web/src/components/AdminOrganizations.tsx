import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building, 
  Phone, 
  Mail, 
  User,
  Eye,
  EyeOff,
  Save,
  X,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  Key,
  School,
  UserPlus,
  Check,
  Play,
  Pause,
  Archive,
  Upload,
  Copy,
  Link,
  Send,
  Clock,
  Image
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api";
import type { Organization, InsertOrganization, SubscriptionPlan } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

const organizationTypes = [
  { value: "company", label: "Company" },
  { value: "ngo", label: "NGO" },
  { value: "foundation", label: "Foundation" },
  { value: "government", label: "Government" }
];

interface SelectedSubscription {
  planId: number;
  planName: string;
  quantity: number;
}

const accessModels = [
  { value: "school", label: "School-Based", description: "Link specific schools, students at those schools get access" },
  { value: "invited", label: "Invited Students", description: "Send email invitations to specific students" },
  { value: "open", label: "Open Access Code", description: "Generate codes that students can use to register" }
];

const statusOptions = [
  { value: "inactive", label: "Inactive", icon: EyeOff, color: "bg-gray-100 text-gray-800" },
  { value: "active", label: "Active", icon: Play, color: "bg-green-100 text-green-800" },
  { value: "suspended", label: "Suspended", icon: Pause, color: "bg-yellow-100 text-yellow-800" },
  { value: "archived", label: "Archived", icon: Archive, color: "bg-red-100 text-red-800" }
];

interface OrganizationFormData {
  name: string;
  type: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  subscriptionTier?: string;
  seatLimit?: number;
  isSeatUnlimited?: boolean;
  isActive?: boolean;
  status?: string;
  accessModels?: string[];
  notes?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  selectedSubscriptions?: SelectedSubscription[];
}

export default function AdminOrganizations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [expandedOrgId, setExpandedOrgId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("schools");
  
  // New school/invite/code form states
  const [newSchoolId, setNewSchoolId] = useState<number | null>(null);
  const [newSchoolSeats, setNewSchoolSeats] = useState(10);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: "",
    type: "company",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    subscriptionTier: "basic",
    isActive: false,
    status: "inactive",
    accessModels: [],
    seatLimit: 100,
    isSeatUnlimited: false,
    notes: "",
    subscriptionStart: "",
    subscriptionEnd: "",
    selectedSubscriptions: []
  });

  const { data: organizations = [], isLoading, refetch } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    staleTime: 0,
    retry: 1
  });

  const { data: subscriptionPlans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
    staleTime: 60000
  });

  // Query for available schools
  const { data: allSchools = [] } = useQuery<any[]>({
    queryKey: ['/api/schools'],
    staleTime: 60000
  });

  // Queries for expanded organization details
  const { data: orgSchools = [], refetch: refetchSchools } = useQuery<any[]>({
    queryKey: [`/api/organizations/${expandedOrgId}/schools`],
    enabled: !!expandedOrgId,
  });

  const { data: orgInvites = [], refetch: refetchInvites } = useQuery<any[]>({
    queryKey: [`/api/organizations/${expandedOrgId}/invites`],
    enabled: !!expandedOrgId,
  });

  const { data: orgAccessCodes = [], refetch: refetchCodes } = useQuery<any[]>({
    queryKey: [`/api/organizations/${expandedOrgId}/access-codes`],
    enabled: !!expandedOrgId,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Mutation for adding a school to organization
  const addSchoolMutation = useMutation({
    mutationFn: async ({ orgId, schoolId, allocatedSeats }: { orgId: number; schoolId: number; allocatedSeats: number }) => {
      return await apiRequest(`/api/organizations/${orgId}/schools`, { method: "POST", body: { schoolId, allocatedSeats } });
    },
    onSuccess: () => {
      refetchSchools();
      setNewSchoolId(null);
      setNewSchoolSeats(10);
      toast({ title: "School linked successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to link school", variant: "destructive" });
    }
  });

  // Mutation for sending invite
  const sendInviteMutation = useMutation({
    mutationFn: async ({ orgId, studentEmail }: { orgId: number; studentEmail: string }) => {
      return await apiRequest(`/api/organizations/${orgId}/invites`, { method: "POST", body: { studentEmail } });
    },
    onSuccess: () => {
      refetchInvites();
      setNewInviteEmail("");
      toast({ title: "Invitation sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send invite", variant: "destructive" });
    }
  });

  // Mutation for bulk invites from CSV
  const bulkInviteMutation = useMutation({
    mutationFn: async ({ orgId, emails }: { orgId: number; emails: string[] }) => {
      return await apiRequest(`/api/organizations/${orgId}/invites/bulk`, { method: "POST", body: { emails } });
    },
    onSuccess: (data: any) => {
      refetchInvites();
      setBulkEmails([]);
      setCsvFileName("");
      const message = `Created ${data.created} invites` + 
        (data.duplicates > 0 ? `, ${data.duplicates} duplicates skipped` : '') +
        (data.invalidEmails > 0 ? `, ${data.invalidEmails} invalid emails` : '');
      toast({ title: "Bulk invites processed", description: message });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send bulk invites", variant: "destructive" });
    }
  });

  // Handle CSV file upload for bulk invites
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Parse CSV - extract emails from first column or any column containing @ symbol
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      const emails: string[] = [];
      
      for (const line of lines) {
        // Skip header row if it looks like a header
        if (line.toLowerCase().includes('email') && lines.indexOf(line) === 0) continue;
        
        // Split by comma, semicolon, or tab
        const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        
        // Find email in any column
        for (const part of parts) {
          if (part.includes('@') && part.includes('.')) {
            emails.push(part);
            break;
          }
        }
      }
      
      setBulkEmails(emails);
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  // Mutation for generating access code
  const generateCodeMutation = useMutation({
    mutationFn: async ({ orgId, maxUses }: { orgId: number; maxUses: number | null }) => {
      return await apiRequest(`/api/organizations/${orgId}/access-codes`, { method: "POST", body: { maxUses } });
    },
    onSuccess: () => {
      refetchCodes();
      setNewCodeMaxUses(null);
      toast({ title: "Access code generated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to generate code", variant: "destructive" });
    }
  });

  // Handle logo upload
  const handleLogoUpload = async (orgId: number, file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(buildApiUrl(`/api/organizations/${orgId}/logo`), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to upload logo');
      
      await refetch();
      toast({ title: "Logo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const createOrgMutation = useMutation({
    mutationFn: async (orgData: InsertOrganization): Promise<Organization> => {
      return await apiRequest("/api/organizations", { method: "POST", body: orgData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      refetch();
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    }
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, ...orgData }: { id: number } & Partial<InsertOrganization>): Promise<Organization> => {
      return await apiRequest(`/api/organizations/${id}`, { method: "PUT", body: orgData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      refetch();
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }): Promise<Organization> => {
      return await apiRequest(`/api/organizations/${id}/status`, { method: "PATCH", body: { status } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      refetch();
      toast({
        title: "Success",
        description: "Organization status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiRequest(`/api/organizations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      refetch();
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "company",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      subscriptionTier: "basic",
      isActive: false,
      status: "inactive",
      accessModels: [],
      seatLimit: 100,
      isSeatUnlimited: false,
      notes: "",
      subscriptionStart: "",
      subscriptionEnd: "",
      selectedSubscriptions: []
    });
    setEditingOrg(null);
    setShowForm(false);
    setWizardStep(1);
  };

  const toggleAccessModel = (modelValue: string) => {
    const current = formData.accessModels || [];
    if (current.includes(modelValue)) {
      setFormData({
        ...formData,
        accessModels: current.filter(m => m !== modelValue)
      });
    } else {
      setFormData({
        ...formData,
        accessModels: [...current, modelValue]
      });
    }
  };

  const toggleSubscription = (plan: SubscriptionPlan) => {
    const current = formData.selectedSubscriptions || [];
    const exists = current.find(s => s.planId === plan.id);
    
    if (exists) {
      setFormData({
        ...formData,
        selectedSubscriptions: current.filter(s => s.planId !== plan.id)
      });
    } else {
      setFormData({
        ...formData,
        selectedSubscriptions: [...current, { planId: plan.id, planName: plan.name, quantity: 1 }]
      });
    }
  };

  const updateSubscriptionQuantity = (planId: number, quantity: number) => {
    const current = formData.selectedSubscriptions || [];
    setFormData({
      ...formData,
      selectedSubscriptions: current.map(s => 
        s.planId === planId ? { ...s, quantity: Math.max(1, quantity) } : s
      )
    });
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    // Parse accessModels - handle comma-separated string format
    let accessModelsArray: string[] = [];
    if (org.accessModel) {
      // Split comma-separated values into array
      accessModelsArray = org.accessModel.split(',').filter(m => m.trim() !== '');
    }
    
    setFormData({
      name: org.name,
      type: org.type,
      contactPerson: org.contactPerson,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone || "",
      address: org.address || "",
      subscriptionTier: org.subscriptionTier || "basic",
      isActive: org.isActive ?? false,
      status: org.status || "inactive",
      accessModels: accessModelsArray,
      seatLimit: org.seatLimit || 100,
      isSeatUnlimited: org.isSeatUnlimited || false,
      notes: org.notes || "",
      subscriptionStart: org.subscriptionStart ? new Date(org.subscriptionStart).toISOString().split('T')[0] : "",
      subscriptionEnd: org.subscriptionEnd ? new Date(org.subscriptionEnd).toISOString().split('T')[0] : "",
      selectedSubscriptions: []
    });
    setShowForm(true);
    setWizardStep(1);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.type || !formData.contactPerson || !formData.contactEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Convert accessModels array to comma-separated accessModel string for backend compatibility
    const accessModelsArray = formData.accessModels || [];
    const accessModelString = accessModelsArray.length > 0 ? accessModelsArray.join(',') : null;
    
    const submitData: any = {
      name: formData.name,
      type: formData.type,
      contactPerson: formData.contactPerson,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone || null,
      address: formData.address || null,
      subscriptionTier: formData.subscriptionTier || "basic",
      isActive: formData.isActive || false,
      status: formData.status || "inactive",
      accessModel: accessModelString,
      seatLimit: formData.seatLimit || 100,
      isSeatUnlimited: formData.isSeatUnlimited || false,
      notes: formData.notes || null,
      subscriptionStart: formData.subscriptionStart && formData.subscriptionStart.trim() !== '' 
        ? new Date(formData.subscriptionStart) 
        : null,
      subscriptionEnd: formData.subscriptionEnd && formData.subscriptionEnd.trim() !== '' 
        ? new Date(formData.subscriptionEnd) 
        : null,
      selectedSubscriptions: formData.selectedSubscriptions || []
    };
    
    if (editingOrg) {
      updateOrgMutation.mutate({ id: editingOrg.id, ...submitData });
    } else {
      createOrgMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteOrgMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const filteredOrganizations = organizations.filter((org: Organization) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || org.type === selectedType;
    const orgStatus = org.status || (org.isActive ? "active" : "inactive");
    const matchesStatus = selectedStatus === "all" || orgStatus === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "company": return "bg-blue-100 text-blue-800";
      case "ngo": return "bg-green-100 text-green-800";
      case "foundation": return "bg-purple-100 text-purple-800";
      case "government": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (org: Organization) => {
    const status = org.status || (org.isActive ? "active" : "inactive");
    const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getAccessModelLabel = (model: string) => {
    const accessModel = accessModels.find(m => m.value === model);
    return accessModel?.label || model;
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 1: Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter organization name"
                  data-testid="input-org-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Organization Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="select-org-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Primary contact name"
                  data-testid="input-contact-person"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@organization.com"
                  data-testid="input-contact-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone || ""}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+27 XX XXX XXXX"
                  data-testid="input-contact-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Organization address"
                  data-testid="input-address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this organization..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 2: Subscription & Seats</h3>
            
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Subscription Plans</h4>
              <p className="text-sm text-slate-600">Select one or more subscription plans for this organization</p>
              
              {subscriptionPlans.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No subscription plans available. Create plans in the Subscriptions section first.</p>
              ) : (
                <div className="grid gap-3">
                  {subscriptionPlans.map((plan) => {
                    const isSelected = (formData.selectedSubscriptions || []).some(s => s.planId === plan.id);
                    const selectedPlan = (formData.selectedSubscriptions || []).find(s => s.planId === plan.id);
                    
                    return (
                      <div
                        key={plan.id}
                        className={`border rounded-lg p-3 transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`plan-${plan.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleSubscription(plan)}
                            data-testid={`checkbox-plan-${plan.id}`}
                          />
                          <div className="flex-1">
                            <label htmlFor={`plan-${plan.id}`} className="font-medium cursor-pointer">
                              {plan.name}
                            </label>
                            <p className="text-sm text-slate-600">
                              R{((plan.amount || 0) / 100).toFixed(2)} / {plan.interval}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`qty-${plan.id}`} className="text-sm">Qty:</Label>
                              <Input
                                id={`qty-${plan.id}`}
                                type="number"
                                min="1"
                                className="w-20"
                                value={selectedPlan?.quantity || 1}
                                onChange={(e) => updateSubscriptionQuantity(plan.id, parseInt(e.target.value) || 1)}
                                data-testid={`input-qty-${plan.id}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select
                  value={formData.status || "inactive"}
                  onValueChange={(value) => setFormData({ ...formData, status: value, isActive: value === "active" })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriptionStart">Subscription Start Date</Label>
                <Input
                  id="subscriptionStart"
                  type="date"
                  value={formData.subscriptionStart || ""}
                  onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriptionEnd">Subscription End Date</Label>
                <Input
                  id="subscriptionEnd"
                  type="date"
                  value={formData.subscriptionEnd || ""}
                  onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Seat Allocation</h4>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isSeatUnlimited"
                  checked={formData.isSeatUnlimited || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isSeatUnlimited: checked })}
                  data-testid="switch-unlimited-seats"
                />
                <Label htmlFor="isSeatUnlimited">Unlimited seats</Label>
              </div>
              
              {!formData.isSeatUnlimited && (
                <div className="space-y-2">
                  <Label htmlFor="seatLimit">Total Seat Limit</Label>
                  <Input
                    id="seatLimit"
                    type="number"
                    min="1"
                    value={formData.seatLimit || 100}
                    onChange={(e) => setFormData({ ...formData, seatLimit: parseInt(e.target.value) || 100 })}
                    placeholder="100"
                    data-testid="input-seat-limit"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        const selectedModels = formData.accessModels || [];
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 3: Access Model</h3>
            <p className="text-sm text-slate-600">
              Choose how students will gain sponsored access through this organization. You can select multiple options.
            </p>
            
            <div className="grid gap-4">
              {accessModels.map((model) => {
                const isSelected = selectedModels.includes(model.value);
                return (
                  <div
                    key={model.value}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => toggleAccessModel(model.value)}
                    data-testid={`access-model-${model.value}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAccessModel(model.value)}
                        className="mt-1"
                        data-testid={`checkbox-access-model-${model.value}`}
                      />
                      <div className={`p-2 rounded-full ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {model.value === 'school' && <School className="w-5 h-5" />}
                        {model.value === 'invited' && <UserPlus className="w-5 h-5" />}
                        {model.value === 'open' && <Key className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{model.label}</h4>
                        </div>
                        <p className="text-sm text-slate-600">{model.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedModels.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {selectedModels.includes('school') && (
                    <li>• You can link schools and allocate seats to each school.</li>
                  )}
                  {selectedModels.includes('invited') && (
                    <li>• You can send email invitations to specific students.</li>
                  )}
                  {selectedModels.includes('open') && (
                    <li>• You can generate access codes for students to use during registration.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Organization Management</h2>
          <p className="text-slate-600">Manage organizations that sponsor student access</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="gap-2"
          data-testid="button-add-organization"
        >
          <Plus className="w-4 h-4" />
          Add Organization
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingOrg ? "Edit Organization" : "Add New Organization"}</CardTitle>
            <CardDescription>
              {editingOrg ? "Update organization details" : `Step ${wizardStep} of 3`}
            </CardDescription>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    step <= wizardStep ? 'bg-primary' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {renderWizardStep()}
            
            <div className="flex justify-between mt-6 pt-4 border-t">
              <div>
                {wizardStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    data-testid="button-previous"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                
                {wizardStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    data-testid="button-next"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={createOrgMutation.isPending || updateOrgMutation.isPending}
                    data-testid="button-save-organization"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingOrg ? "Update" : "Create"} Organization
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Organizations
          </CardTitle>
          <CardDescription>
            {filteredOrganizations.length} organization{filteredOrganizations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-organizations"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-filter-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {organizationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading organizations...</div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No organizations found. Click "Add Organization" to create one.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOrganizations.map((org: Organization) => (
                <div
                  key={org.id}
                  className={`border rounded-lg p-4 ${
                    org.status === 'archived' ? 'bg-slate-50 opacity-75' : 'bg-white'
                  }`}
                  data-testid={`card-organization-${org.id}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Logo section */}
                    <div className="flex-shrink-0">
                      <div className="relative w-16 h-16 rounded-lg border bg-slate-100 flex items-center justify-center overflow-hidden">
                        {(org as any).logoUrl ? (
                          <img 
                            src={(org as any).logoUrl} 
                            alt={`${org.name} logo`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building className="w-8 h-8 text-slate-400" />
                        )}
                        <label 
                          className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          data-testid={`button-upload-logo-${org.id}`}
                        >
                          <Upload className="w-5 h-5 text-white" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(org.id, file);
                            }}
                            disabled={uploadingLogo}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{org.name}</h3>
                        <Badge className={getTypeBadgeColor(org.type)}>
                          {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
                        </Badge>
                        {getStatusBadge(org)}
                        {org.accessModel && (
                          <Badge variant="outline">
                            {getAccessModelLabel(org.accessModel)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {org.contactPerson}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {org.contactEmail}
                        </div>
                        {org.contactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {org.contactPhone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {org.currentSponsoredCount || 0} / {org.isSeatUnlimited ? '∞' : org.seatLimit || 100} seats
                        </div>
                        {org.subscriptionEnd && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Expires: {new Date(org.subscriptionEnd).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      {org.notes && (
                        <p className="text-sm text-slate-500 mt-2">{org.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(org)}
                          data-testid={`button-edit-org-${org.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(org.id, org.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-org-${org.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                          data-testid={`button-manage-org-${org.id}`}
                        >
                          {expandedOrgId === org.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      <Select
                        value={org.status || (org.isActive ? "active" : "inactive")}
                        onValueChange={(value) => handleStatusChange(org.id, value)}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-status-org-${org.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Expandable Management Panel */}
                  {expandedOrgId === org.id && (
                    <div className="mt-4 pt-4 border-t">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="schools" className="flex items-center gap-2">
                            <School className="w-4 h-4" />
                            Schools
                          </TabsTrigger>
                          <TabsTrigger value="invites" className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Invites
                          </TabsTrigger>
                          <TabsTrigger value="codes" className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Access Codes
                          </TabsTrigger>
                        </TabsList>

                        {/* Schools Tab */}
                        <TabsContent value="schools" className="mt-4">
                          <div className="space-y-4">
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label>Link School</Label>
                                <Select 
                                  value={newSchoolId?.toString() || ""} 
                                  onValueChange={(v) => setNewSchoolId(parseInt(v))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a school" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allSchools.map((school: any) => (
                                      <SelectItem key={school.id} value={school.id.toString()}>
                                        {school.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-32">
                                <Label>Seats</Label>
                                <Input 
                                  type="number" 
                                  value={newSchoolSeats} 
                                  onChange={(e) => setNewSchoolSeats(parseInt(e.target.value) || 0)}
                                  data-testid="input-school-seats"
                                />
                              </div>
                              <Button 
                                onClick={() => {
                                  if (newSchoolId) {
                                    addSchoolMutation.mutate({ orgId: org.id, schoolId: newSchoolId, allocatedSeats: newSchoolSeats });
                                  }
                                }}
                                disabled={!newSchoolId || addSchoolMutation.isPending}
                                data-testid="button-link-school"
                              >
                                <Plus className="w-4 h-4 mr-1" /> Link
                              </Button>
                            </div>

                            {orgSchools.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">No schools linked yet</p>
                            ) : (
                              <div className="space-y-2">
                                {orgSchools.map((os: any) => (
                                  <div key={os.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <School className="w-4 h-4 text-slate-600" />
                                      <span className="font-medium">{os.schoolName || `School #${os.schoolId}`}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">
                                        {os.usedSeats || 0} / {os.allocatedSeats} seats
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        {/* Invites Tab */}
                        <TabsContent value="invites" className="mt-4">
                          <div className="space-y-4">
                            {/* Single email invite */}
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label>Student Email</Label>
                                <Input 
                                  type="email" 
                                  placeholder="student@example.com"
                                  value={newInviteEmail}
                                  onChange={(e) => setNewInviteEmail(e.target.value)}
                                  data-testid="input-invite-email"
                                />
                              </div>
                              <Button 
                                onClick={() => {
                                  if (newInviteEmail) {
                                    sendInviteMutation.mutate({ orgId: org.id, studentEmail: newInviteEmail });
                                  }
                                }}
                                disabled={!newInviteEmail || sendInviteMutation.isPending}
                                data-testid="button-send-invite"
                              >
                                <Send className="w-4 h-4 mr-1" /> Send Invite
                              </Button>
                            </div>

                            {/* Bulk CSV upload */}
                            <div className="border-t pt-4">
                              <Label className="text-sm font-medium mb-2 block">Bulk Invite from CSV</Label>
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg hover:bg-slate-50 transition-colors">
                                      <Upload className="w-4 h-4 text-slate-500" />
                                      <span className="text-sm text-slate-600">
                                        {csvFileName || "Choose CSV file..."}
                                      </span>
                                      <input
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleCsvUpload}
                                        className="hidden"
                                        data-testid="input-csv-file"
                                      />
                                    </label>
                                    {bulkEmails.length > 0 && (
                                      <Badge variant="outline" className="bg-blue-50">
                                        {bulkEmails.length} emails found
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  onClick={() => {
                                    if (bulkEmails.length > 0) {
                                      bulkInviteMutation.mutate({ orgId: org.id, emails: bulkEmails });
                                    }
                                  }}
                                  disabled={bulkEmails.length === 0 || bulkInviteMutation.isPending}
                                  data-testid="button-bulk-invite"
                                >
                                  <Users className="w-4 h-4 mr-1" /> 
                                  {bulkInviteMutation.isPending ? "Sending..." : `Send ${bulkEmails.length} Invites`}
                                </Button>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Upload a CSV with email addresses. The system will auto-detect emails from any column.
                              </p>
                            </div>

                            {orgInvites.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">No invitations sent yet</p>
                            ) : (
                              <div className="space-y-2">
                                {orgInvites.map((invite: any) => (
                                  <div key={invite.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-slate-600" />
                                      <span>{invite.studentEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant={invite.inviteStatus === 'accepted' ? 'default' : 'outline'}
                                        className={invite.inviteStatus === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                                      >
                                        {invite.inviteStatus}
                                      </Badge>
                                      {invite.invitedAt && (
                                        <span className="text-xs text-slate-500">
                                          {new Date(invite.invitedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        {/* Access Codes Tab */}
                        <TabsContent value="codes" className="mt-4">
                          <div className="space-y-4">
                            <div className="flex gap-2 items-end">
                              <div className="w-32">
                                <Label>Max Uses</Label>
                                <Input 
                                  type="number" 
                                  placeholder="Unlimited"
                                  value={newCodeMaxUses || ''}
                                  onChange={(e) => setNewCodeMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                                  data-testid="input-code-max-uses"
                                />
                              </div>
                              <Button 
                                onClick={() => {
                                  generateCodeMutation.mutate({ orgId: org.id, maxUses: newCodeMaxUses });
                                }}
                                disabled={generateCodeMutation.isPending}
                                data-testid="button-generate-code"
                              >
                                <Key className="w-4 h-4 mr-1" /> Generate Code
                              </Button>
                            </div>

                            {orgAccessCodes.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">No access codes generated yet</p>
                            ) : (
                              <div className="space-y-2">
                                {orgAccessCodes.map((code: any) => (
                                  <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Key className="w-4 h-4 text-slate-600" />
                                      <code className="font-mono text-lg bg-slate-200 px-2 py-1 rounded">{code.code}</code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(code.code)}
                                        data-testid={`button-copy-code-${code.id}`}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={code.isActive ? 'default' : 'outline'}>
                                        {code.currentUses || 0} / {code.maxUses || '∞'} uses
                                      </Badge>
                                      {code.expiresAt && (
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {new Date(code.expiresAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
