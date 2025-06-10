import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, MapPin, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Court {
  id: number;
  name: string;
  description: string;
  surface: string;
  status: "active" | "maintenance" | "inactive";
  hourlyRate: number;
  location: string;
  features: string[];
}

// Sample data - replace with real API data
const sampleCourts: Court[] = [
  {
    id: 1,
    name: "Court 1",
    description: "Premium court with excellent lighting",
    surface: "Hard Court",
    status: "active",
    hourlyRate: 25,
    location: "North Wing",
    features: ["LED Lighting", "Sound System", "Ball Machine"],
  },
  {
    id: 2,
    name: "Court 2",
    description: "Clay court for professional matches",
    surface: "Clay",
    status: "active",
    hourlyRate: 30,
    location: "South Wing",
    features: ["Clay Surface", "Professional Net", "Seating"],
  },
  {
    id: 3,
    name: "Court 3",
    description: "Indoor court available year-round",
    surface: "Hard Court",
    status: "maintenance",
    hourlyRate: 20,
    location: "Indoor Complex",
    features: ["Air Conditioning", "Indoor", "Professional Lighting"],
  },
];

const surfaceTypes = ["Hard Court", "Clay", "Grass", "Synthetic"];
const statusOptions = ["active", "maintenance", "inactive"];

export const AdminCourtsManagement = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    surface: "Hard Court",
    status: "active" as Court["status"],
    hourlyRate: 25,
    location: "",
    features: [] as string[],
  });

  // Mock query - replace with real API call
  const { data: courts = sampleCourts, isLoading } = useQuery<Court[]>({
    queryKey: ["/api/admin/courts"],
    queryFn: async () => {
      // Simulate API call
      return new Promise<Court[]>((resolve) => {
        setTimeout(() => resolve(sampleCourts), 500);
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      surface: "Hard Court",
      status: "active",
      hourlyRate: 25,
      location: "",
      features: [],
    });
    setEditingCourt(null);
  };

  const handleEdit = (court: Court) => {
    setEditingCourt(court);
    setFormData({
      name: court.name,
      description: court.description,
      surface: court.surface,
      status: court.status,
      hourlyRate: court.hourlyRate,
      location: court.location,
      features: [...court.features],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    // Mock submission - replace with real API call
    toast({
      title: editingCourt ? "Court Updated" : "Court Created",
      description: `${formData.name} has been ${editingCourt ? 'updated' : 'created'} successfully.`,
    });
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (courtId: number, courtName: string) => {
    // Mock deletion - replace with real API call
    toast({
      title: "Court Deleted",
      description: `${courtName} has been deleted successfully.`,
    });
  };

  const availableFeatures = [
    "LED Lighting",
    "Sound System",
    "Ball Machine",
    "Air Conditioning",
    "Professional Net",
    "Seating",
    "Indoor",
    "Outdoor",
    "Professional Lighting",
    "Clay Surface",
    "Line Calling System",
    "Scoreboard"
  ];

  const getStatusBadge = (status: Court["status"]) => {
    const variants = {
      active: "default",
      maintenance: "secondary",
      inactive: "destructive",
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading courts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Courts Management</h2>
          <p className="text-gray-600">Manage tennis courts and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCourt ? "Edit Court" : "Add New Court"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Court Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Court 1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="e.g., North Wing"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the court"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="surface">Surface Type</Label>
                  <select
                    id="surface"
                    value={formData.surface}
                    onChange={(e) => handleInputChange("surface", e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {surfaceTypes.map(surface => (
                      <option key={surface} value={surface}>{surface}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => handleInputChange("hourlyRate", parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label>Features</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {availableFeatures.map(feature => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Switch
                        id={feature}
                        checked={formData.features.includes(feature)}
                        onCheckedChange={() => handleFeatureToggle(feature)}
                      />
                      <Label htmlFor={feature} className="text-sm">
                        {feature}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingCourt ? "Update Court" : "Create Court"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Courts Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courts.map((court) => (
                <TableRow key={court.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{court.name}</div>
                      <div className="text-sm text-gray-500">{court.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{court.surface}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {court.location}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(court.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      ${court.hourlyRate}/hr
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {court.features.slice(0, 2).map(feature => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {court.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{court.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(court)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(court.id, court.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}; 