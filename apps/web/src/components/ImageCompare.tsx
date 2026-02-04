import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageIcon, RefreshCw, Check, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImageType {
  id: string;
  name: string;
  description: string;
  params: string[];
}

interface CompareResult {
  python?: {
    success: boolean;
    imageUrl?: string;
    error?: string;
  };
  wolfram?: {
    success: boolean;
    imageUrl?: string;
    error?: string;
    query?: string;
  };
}

export default function ImageCompare() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [params, setParams] = useState<Record<string, any>>({});
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [customExpression, setCustomExpression] = useState("");
  const [activeTab, setActiveTab] = useState("preset");

  const { data: imageTypes } = useQuery<{ types: ImageType[] }>({
    queryKey: ["/api/math-image-types"],
  });

  const graphTypes = imageTypes?.types?.filter(t => 
    ["linear", "quadratic", "trig", "exponential", "logarithm", "hyperbola"].includes(t.id)
  ) || [];

  const geometryTypes = imageTypes?.types?.filter(t => 
    ["triangle", "circle", "rectangle", "angle", "parallelLines"].includes(t.id)
  ) || [];

  const shape3DTypes = imageTypes?.types?.filter(t => 
    ["cylinder", "cube", "cone", "pyramid", "sphere"].includes(t.id)
  ) || [];

  const chartTypes = imageTypes?.types?.filter(t => 
    ["pie", "bar", "numberLine", "coordinatePlane", "venn", "fraction"].includes(t.id)
  ) || [];

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    setCompareResult(null);
    const typeInfo = imageTypes?.types?.find(t => t.id === typeId);
    if (typeInfo) {
      const defaultParams: Record<string, any> = {};
      switch (typeId) {
        case "linear":
          defaultParams.m = 2;
          defaultParams.c = 1;
          defaultParams.xMin = -10;
          defaultParams.xMax = 10;
          break;
        case "quadratic":
          defaultParams.a = 1;
          defaultParams.b = 0;
          defaultParams.c = -4;
          defaultParams.xMin = -10;
          defaultParams.xMax = 10;
          break;
        case "trig":
          defaultParams.function = "sin";
          defaultParams.amplitude = 1;
          defaultParams.period = 1;
          defaultParams.phase = 0;
          break;
        case "exponential":
          defaultParams.a = 1;
          defaultParams.base = 2;
          defaultParams.c = 0;
          defaultParams.xMin = -5;
          defaultParams.xMax = 5;
          break;
        case "circle":
          defaultParams.radius = 5;
          defaultParams.showCenter = true;
          defaultParams.showRadius = true;
          break;
        case "cylinder":
        case "cone":
          defaultParams.radius = 3;
          defaultParams.height = 5;
          break;
        case "sphere":
          defaultParams.radius = 3;
          break;
        case "pie":
          defaultParams.values = [30, 25, 20, 15, 10];
          defaultParams.labels = ["A", "B", "C", "D", "E"];
          break;
        case "bar":
          defaultParams.values = [10, 20, 15, 25, 30];
          defaultParams.labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
          break;
        default:
          break;
      }
      setParams(defaultParams);
    }
  };

  const handleCompare = async () => {
    if (activeTab === "preset" && !selectedType) {
      toast({ title: "Select an image type", variant: "destructive" });
      return;
    }
    if (activeTab === "custom" && !customExpression.trim()) {
      toast({ title: "Enter an expression", variant: "destructive" });
      return;
    }

    setIsComparing(true);
    setCompareResult(null);

    try {
      const body = activeTab === "custom" 
        ? { expression: customExpression }
        : { type: selectedType, params };

      const response = await apiRequest("POST", "/api/image-compare", body);
      const data = await response.json();

      if (data.success) {
        setCompareResult(data.results);
        toast({ title: "Comparison complete!" });
      } else {
        toast({ title: "Comparison failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsComparing(false);
    }
  };

  const handleWolframOnly = async () => {
    if (activeTab === "custom" && !customExpression.trim()) {
      toast({ title: "Enter an expression", variant: "destructive" });
      return;
    }

    setIsComparing(true);

    try {
      const body = activeTab === "custom" 
        ? { expression: customExpression }
        : { type: selectedType, params };

      const response = await apiRequest("POST", "/api/wolfram/generate-image", body);
      const data = await response.json();

      if (data.success) {
        setCompareResult({
          wolfram: {
            success: true,
            imageUrl: data.imageUrl,
            query: data.query
          }
        });
        toast({ title: "WolframAlpha image generated!" });
      } else {
        toast({ title: "WolframAlpha failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsComparing(false);
    }
  };

  const renderParamInputs = () => {
    if (!selectedType) return null;

    const typeInfo = imageTypes?.types?.find(t => t.id === selectedType);
    if (!typeInfo) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {Object.entries(params).map(([key, value]) => (
          <div key={key}>
            <Label className="text-sm capitalize">{key}</Label>
            {typeof value === "boolean" ? (
              <Select
                value={value ? "true" : "false"}
                onValueChange={(v) => setParams({ ...params, [key]: v === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : Array.isArray(value) ? (
              <Input
                value={value.join(", ")}
                onChange={(e) => {
                  const arr = e.target.value.split(",").map(v => {
                    const num = parseFloat(v.trim());
                    return isNaN(num) ? v.trim() : num;
                  });
                  setParams({ ...params, [key]: arr });
                }}
                placeholder="comma-separated values"
              />
            ) : key === "function" ? (
              <Select
                value={value as string}
                onValueChange={(v) => setParams({ ...params, [key]: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin">sin</SelectItem>
                  <SelectItem value="cos">cos</SelectItem>
                  <SelectItem value="tan">tan</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="number"
                value={value}
                onChange={(e) => setParams({ ...params, [key]: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Image Generation Comparison</h1>
        <p className="text-slate-600 mt-1">
          Compare math image outputs from Python/matplotlib vs WolframAlpha
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configure Image</CardTitle>
          <CardDescription>Choose a preset type or enter a custom math expression</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="preset">Preset Types</TabsTrigger>
              <TabsTrigger value="custom">Custom Expression</TabsTrigger>
            </TabsList>

            <TabsContent value="preset">
              <div className="space-y-4">
                <div>
                  <Label>Image Type</Label>
                  <Select value={selectedType} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select image type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Graphs</div>
                      {graphTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 mt-2">2D Geometry</div>
                      {geometryTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 mt-2">3D Shapes</div>
                      {shape3DTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 mt-2">Charts & More</div>
                      {chartTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderParamInputs()}
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <div className="space-y-4">
                <div>
                  <Label>Math Expression for WolframAlpha</Label>
                  <Input
                    value={customExpression}
                    onChange={(e) => setCustomExpression(e.target.value)}
                    placeholder="e.g., plot sin(x) + cos(2x) from x=-2pi to 2pi"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Examples: "plot x^2 + 2x - 3", "graph y = 2sin(x)", "3d plot x^2 + y^2"
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleCompare} disabled={isComparing}>
              {isComparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Compare Both
            </Button>
            <Button variant="outline" onClick={handleWolframOnly} disabled={isComparing}>
              <ImageIcon className="w-4 h-4 mr-2" />
              WolframAlpha Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {compareResult && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Python / matplotlib</CardTitle>
                {compareResult.python?.success ? (
                  <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Success</Badge>
                ) : compareResult.python?.error ? (
                  <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Failed</Badge>
                ) : (
                  <Badge variant="secondary">Not Run</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {compareResult.python?.success && compareResult.python.imageUrl ? (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <img 
                    src={compareResult.python.imageUrl} 
                    alt="Python matplotlib output" 
                    className="w-full h-auto"
                  />
                </div>
              ) : compareResult.python?.error ? (
                <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{compareResult.python.error}</span>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">WolframAlpha</CardTitle>
                {compareResult.wolfram?.success ? (
                  <Badge className="bg-orange-500"><Check className="w-3 h-3 mr-1" /> Success</Badge>
                ) : compareResult.wolfram?.error ? (
                  <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Failed</Badge>
                ) : (
                  <Badge variant="secondary">Not Run</Badge>
                )}
              </div>
              {compareResult.wolfram?.query && (
                <p className="text-xs text-slate-500 mt-1">Query: {compareResult.wolfram.query}</p>
              )}
            </CardHeader>
            <CardContent>
              {compareResult.wolfram?.success && compareResult.wolfram.imageUrl ? (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <img 
                    src={compareResult.wolfram.imageUrl} 
                    alt="WolframAlpha output" 
                    className="w-full h-auto"
                  />
                </div>
              ) : compareResult.wolfram?.error ? (
                <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{compareResult.wolfram.error}</span>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About This Tool</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            <strong>Python/matplotlib:</strong> Generates images locally using our custom Python script. 
            Supports 17+ diagram types including graphs, geometry, 3D shapes, and charts.
          </p>
          <p>
            <strong>WolframAlpha:</strong> Uses the WolframAlpha API to generate computational knowledge images. 
            Great for function plots and mathematical visualizations.
          </p>
          <p className="text-amber-600">
            Note: WolframAlpha requires an API key (WOLFRAM_ALPHA_APPID secret). 
            Free tier includes 2,000 API calls/month.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
