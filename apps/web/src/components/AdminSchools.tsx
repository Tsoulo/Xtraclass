import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User,
  Eye,
  EyeOff,
  Save,
  X,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { School, InsertSchool } from "@shared/schema";

interface AdminSchoolsProps {
  grade?: number;
  subject?: string;
  subjectName?: string;
}

const provinces = [
  "Eastern Cape",
  "Free State", 
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape"
];

export default function AdminSchools({ grade, subject, subjectName }: AdminSchoolsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    processed: number;
    success: number;
    errors: string[];
  } | null>(null);
  
  const [formData, setFormData] = useState<InsertSchool>({
    name: "",
    province: "",
    district: "",
    address: "",
    contactNumber: "",
    email: "",
    principalName: "",
    isActive: true
  });

  // Fetch schools
  const { data: schools = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/schools'],
    staleTime: 0, // Always fetch fresh data
    retry: 1
  });

  // Force refetch schools when component mounts to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: async (schoolData: InsertSchool): Promise<School> => {
      const response = await apiRequest("POST", "/api/schools", schoolData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      refetch(); // Force immediate refetch
      toast({
        title: "Success",
        description: "School created successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create school",
        variant: "destructive",
      });
    }
  });

  // Update school mutation
  const updateSchoolMutation = useMutation({
    mutationFn: async ({ id, ...schoolData }: { id: number } & Partial<InsertSchool>): Promise<School> => {
      const response = await apiRequest("PUT", `/api/schools/${id}`, schoolData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      refetch(); // Force immediate refetch
      toast({
        title: "Success",
        description: "School updated successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update school",
        variant: "destructive",
      });
    }
  });

  // Delete school mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiRequest("DELETE", `/api/schools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      refetch(); // Force immediate refetch
      toast({
        title: "Success",
        description: "School deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete school",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      province: "",
      district: "",
      address: "",
      contactNumber: "",
      email: "",
      principalName: "",
      isActive: true
    });
    setEditingSchool(null);
    setShowForm(false);
  };

  // CSV parsing function
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return []; // Need at least header and one data row
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          row[header] = values[index];
        }
      });
      
      // Only include rows with at least a school name
      if (row['school name'] || row['schoolname'] || row['name']) {
        data.push(row);
      }
    }
    
    return data;
  };

  // CSV upload mutation
  const uploadCSVMutation = useMutation({
    mutationFn: async (file: File): Promise<{ success: number; errors: string[] }> => {
      const text = await file.text();
      const csvData = parseCSV(text);
      
      if (csvData.length === 0) {
        throw new Error('No valid school data found in CSV. Please ensure there is a "school name" column.');
      }

      setUploadProgress({
        total: csvData.length,
        processed: 0,
        success: 0,
        errors: []
      });

      const results = { success: 0, errors: [] as string[] };
      
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Map CSV columns to school data (declare outside try-catch)
        const schoolName = row['school name'] || row['schoolname'] || row['name'];
        const province = row['province'];
        
        try {
          // Validate required fields
          if (!schoolName || !schoolName.trim()) {
            results.errors.push(`Row ${i + 2}: Missing school name`);
            setUploadProgress(prev => prev ? {
              ...prev,
              processed: i + 1
            } : null);
            continue;
          }
          
          if (!province || !province.trim()) {
            results.errors.push(`Row ${i + 2}: Missing province (required field)`);
            setUploadProgress(prev => prev ? {
              ...prev,
              processed: i + 1
            } : null);
            continue;
          }

          const schoolData: InsertSchool = {
            name: schoolName.trim(),
            province: province.trim(),
            district: (row['district'] || "").trim(),
            address: (row['address'] || "").trim(),
            contactNumber: (row['contact number'] || row['contactnumber'] || row['phone'] || "").trim(),
            email: (row['email'] || "").trim(),
            principalName: (row['principal name'] || row['principalname'] || row['principal'] || "").trim(),
            isActive: true
          };

          await apiRequest("/api/schools", { method: "POST", body: schoolData });
          results.success++;
        } catch (error: any) {
          // Log the full error for debugging
          console.error(`Error creating school "${schoolName || 'unknown'}":`, error);
          
          // Extract meaningful error message
          let errorMessage = 'Unknown error';
          
          if (error?.message) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.toString();
          }
          
          // Check for duplicate school name error (unique constraint)
          if (errorMessage.toLowerCase().includes('unique') || 
              errorMessage.toLowerCase().includes('duplicate') ||
              errorMessage.toLowerCase().includes('already exists')) {
            errorMessage = `School already exists (duplicate name)`;
          }
          
          results.errors.push(`Row ${i + 2} (${schoolName || 'unknown'}): ${errorMessage}`);
        }
        
        setUploadProgress(prev => prev ? {
          ...prev,
          processed: i + 1
        } : null);
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      refetch();
      
      toast({
        title: "CSV Upload Complete",
        description: `Successfully imported ${results.success} schools. ${results.errors.length} errors.`,
      });
      
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadProgress(null);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleUploadSubmit = () => {
    if (uploadFile) {
      uploadCSVMutation.mutate(uploadFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.province) {
      toast({
        title: "Error",
        description: "School name and province are required",
        variant: "destructive",
      });
      return;
    }

    if (editingSchool) {
      updateSchoolMutation.mutate({ id: editingSchool.id, ...formData });
    } else {
      createSchoolMutation.mutate(formData);
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      province: school.province,
      district: school.district || "",
      address: school.address || "",
      contactNumber: school.contactNumber || "",
      email: school.email || "",
      principalName: school.principalName || "",
      isActive: school.isActive ?? true
    });
    setShowForm(true);
  };

  const handleDelete = (school: School) => {
    if (confirm(`Are you sure you want to delete ${school.name}?`)) {
      deleteSchoolMutation.mutate(school.id);
    }
  };

  // Filter schools
  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (school.district || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvince = selectedProvince === "all" || school.province === selectedProvince;
    const matchesStatus = showInactive || school.isActive;
    
    return matchesSearch && matchesProvince && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">School Management</h1>
          <p className="text-slate-600 mt-1">Manage schools in the system</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add School
          </Button>
          <Button 
            onClick={() => setShowUploadForm(true)}
            variant="outline" 
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="All Provinces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Provinces</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={showInactive ? "default" : "outline"}
              onClick={() => setShowInactive(!showInactive)}
              className="w-full sm:w-auto"
            >
              {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {showInactive ? "Hide Inactive" : "Show Inactive"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schools List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading schools...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No schools found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || selectedProvince !== "all" 
                  ? "Try adjusting your search criteria" 
                  : "Get started by adding your first school"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSchools.map((school) => (
            <Card key={school.id} className={`${!school.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{school.name}</h3>
                      <Badge variant={school.isActive ? "default" : "secondary"}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{school.province}</span>
                          {school.district && <span>• {school.district}</span>}
                        </div>
                        {school.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{school.address}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {school.contactNumber && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{school.contactNumber}</span>
                          </div>
                        )}
                        {school.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{school.email}</span>
                          </div>
                        )}
                        {school.principalName && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Principal: {school.principalName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(school)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(school)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit School Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingSchool ? "Edit School" : "Add New School"}
              </CardTitle>
              <CardDescription>
                {editingSchool ? "Update school information" : "Enter school details to add to the system"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">School Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter school name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="province">Province *</Label>
                    <Select 
                      value={formData.province} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Enter district"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter school address"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                      placeholder="Enter contact number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="principalName">Principal Name</Label>
                    <Input
                      id="principalName"
                      value={formData.principalName}
                      onChange={(e) => setFormData(prev => ({ ...prev, principalName: e.target.value }))}
                      placeholder="Enter principal's name"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="isActive">Active School</Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createSchoolMutation.isPending || updateSchoolMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingSchool ? "Update School" : "Add School"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Schools CSV
              </CardTitle>
              <CardDescription>
                Upload a CSV file with school data. Required columns: "school name", "province". 
                Optional columns: "district", "address", "contact number", "email", "principal name".
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!uploadProgress ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <Label htmlFor="csvFile" className="cursor-pointer">
                        <div className="text-lg font-medium text-gray-900">
                          Choose CSV file
                        </div>
                        <div className="text-sm text-gray-500">
                          Click to browse or drag and drop
                        </div>
                      </Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    {uploadFile && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm font-medium text-blue-900">
                          Selected: {uploadFile.name}
                        </p>
                        <p className="text-xs text-blue-700">
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Required: "school name", "province"</li>
                      <li>• Optional: "district", "address", "contact number", "email", "principal name"</li>
                      <li>• First row should contain column headers</li>
                      <li>• Use commas to separate values</li>
                      <li>• Example: school name,province,district,address</li>
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleUploadSubmit}
                      disabled={!uploadFile || uploadCSVMutation.isPending}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadCSVMutation.isPending ? "Uploading..." : "Upload Schools"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowUploadForm(false);
                        setUploadFile(null);
                        setUploadProgress(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 mb-2">Processing CSV File...</h3>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {uploadProgress.processed} of {uploadProgress.total} rows processed
                    </p>
                    <p className="text-sm text-green-600">
                      {uploadProgress.success} schools imported successfully
                    </p>
                    {uploadProgress.errors.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-md">
                        <p className="text-sm font-medium text-red-800 mb-2">
                          {uploadProgress.errors.length} errors occurred:
                        </p>
                        <div className="text-xs text-red-700 max-h-32 overflow-y-auto">
                          {uploadProgress.errors.map((error, index) => (
                            <div key={index}>{error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}