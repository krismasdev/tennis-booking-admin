import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Clock, Save, RefreshCw } from "lucide-react";

interface Court {
  id: number;
  name: string;
  description: string;
  hourlyRate: string;
  isActive: boolean;
}

interface PricingRule {
  id?: number;
  courtId: number;
  timeSlot: string;
  dayOfWeek?: number; // 0-6, Sunday-Saturday
  price: string;
  isActive: boolean;
}

const TIME_SLOTS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30"
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

export function AdminPricingManagement() {
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: pricingRules = [] } = useQuery<PricingRule[]>({
    queryKey: ["/api/pricing-rules", selectedCourt],
    queryFn: async () => {
      if (!selectedCourt) return [];
      const response = await fetch(`/api/pricing-rules?courtId=${selectedCourt}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch pricing rules");
      return response.json();
    },
    enabled: !!selectedCourt,
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (pricingData: { courtId: number; timeSlot: string; price: string }) => {
      const response = await apiRequest("POST", "/api/pricing-rules", pricingData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pricing Updated",
        description: "Time slot pricing has been updated successfully.",
      });
      setEditingPrices({});
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const batchUpdatePricingMutation = useMutation({
    mutationFn: async (updates: Array<{ courtId: number; timeSlot: string; price: string }>) => {
      const response = await apiRequest("POST", "/api/pricing-rules/batch", { updates });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pricing Updated",
        description: "All pricing changes have been saved successfully.",
      });
      setEditingPrices({});
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedCourtData = courts.find(c => c.id === selectedCourt);

  const getPriceForTimeSlot = (timeSlot: string) => {
    const rule = pricingRules.find(r => r.timeSlot === timeSlot);
    return rule?.price || selectedCourtData?.hourlyRate || "0";
  };

  const handlePriceChange = (timeSlot: string, price: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [`${selectedCourt}-${timeSlot}`]: price
    }));
  };

  const savePriceChange = (timeSlot: string) => {
    const key = `${selectedCourt}-${timeSlot}`;
    const price = editingPrices[key];
    
    if (selectedCourt && price) {
      updatePricingMutation.mutate({
        courtId: selectedCourt,
        timeSlot,
        price
      });
    }
  };

  const saveAllChanges = () => {
    const updates = Object.entries(editingPrices).map(([key, price]) => {
      const [courtId, timeSlot] = key.split('-');
      return {
        courtId: parseInt(courtId),
        timeSlot,
        price
      };
    });

    if (updates.length > 0) {
      batchUpdatePricingMutation.mutate(updates);
    }
  };

  const resetPricing = () => {
    setEditingPrices({});
  };

  const applyPeakHourPricing = () => {
    if (!selectedCourt || !selectedCourtData) return;

    const peakHours = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
    const basePrice = parseFloat(selectedCourtData.hourlyRate);
    const peakPrice = (basePrice * 1.5).toFixed(2);

    const updates: Record<string, string> = {};
    peakHours.forEach(timeSlot => {
      updates[`${selectedCourt}-${timeSlot}`] = peakPrice;
    });

    setEditingPrices(prev => ({ ...prev, ...updates }));
  };

  const getTimeSlotCategory = (timeSlot: string) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    if (hour >= 7 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Peak Hours";
    return "Evening";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="court-select">Select Court</Label>
              <Select value={selectedCourt?.toString() || ""} onValueChange={(value) => setSelectedCourt(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a court to manage pricing" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id.toString()}>
                      {court.name} (Base Rate: ${court.hourlyRate}/hour)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCourt && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={applyPeakHourPricing} variant="outline" size="sm">
                  Apply Peak Hour Pricing (+50%)
                </Button>
                <Button onClick={resetPricing} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Changes
                </Button>
                {Object.keys(editingPrices).length > 0 && (
                  <Button onClick={saveAllChanges} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save All Changes ({Object.keys(editingPrices).length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCourt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              30-Minute Time Slot Pricing
            </CardTitle>
            <p className="text-sm text-gray-600">
              Base rate: ${selectedCourtData?.hourlyRate}/hour = ${(parseFloat(selectedCourtData?.hourlyRate || "0") / 2).toFixed(2)}/30 minutes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {["Morning", "Afternoon", "Peak Hours", "Evening"].map(category => (
                <div key={category} className="space-y-3">
                  <h3 className="font-medium text-gray-900 border-b pb-2">{category}</h3>
                  <div className="space-y-2">
                    {TIME_SLOTS
                      .filter(timeSlot => getTimeSlotCategory(timeSlot) === category)
                      .map(timeSlot => {
                        const currentPrice = getPriceForTimeSlot(timeSlot);
                        const editKey = `${selectedCourt}-${timeSlot}`;
                        const editingPrice = editingPrices[editKey];
                        const isEditing = editingPrice !== undefined;
                        
                        return (
                          <div key={timeSlot} className="flex items-center gap-2">
                            <div className="w-16 text-sm text-gray-600">{timeSlot}</div>
                            <div className="flex-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={isEditing ? editingPrice : currentPrice}
                                onChange={(e) => handlePriceChange(timeSlot, e.target.value)}
                                className={`h-8 text-sm ${isEditing ? 'border-orange-300 bg-orange-50' : ''}`}
                                placeholder="Price"
                              />
                            </div>
                            {isEditing && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => savePriceChange(timeSlot)}
                                disabled={updatePricingMutation.isPending}
                                className="h-8 px-2"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(editingPrices).length > 0 && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-orange-800">Unsaved Changes</h4>
                    <p className="text-sm text-orange-600">
                      You have {Object.keys(editingPrices).length} unsaved pricing changes.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={resetPricing} variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button onClick={saveAllChanges} size="sm">
                      Save All
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 