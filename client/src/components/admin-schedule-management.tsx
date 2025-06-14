import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTimeSlotSchema, insertCourtSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Edit2, Trash2, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

// Add CSS to remove number input spinners
const numberInputStyles = `
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

type TimeSlotFormData = z.infer<typeof insertTimeSlotSchema>;
type CourtFormData = z.infer<typeof insertCourtSchema>;

interface Court {
  id: number;
  name: string;
  description: string;
  hourlyRate: string;
  isActive: boolean;
  openTime: string;
  closeTime: string;
}

interface DayPricing {
  day: string;
  price: string;
  enabled: boolean;
}

export function AdminScheduleManagement() {
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [isAddCourtDialogOpen, setIsAddCourtDialogOpen] = useState(false);
  const [isViewCourtDialogOpen, setIsViewCourtDialogOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [courtName, setCourtName] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [dayPricing, setDayPricing] = useState<DayPricing[]>([
    { day: "Monday", price: "0.00", enabled: true },
    { day: "Tuesday", price: "0.00", enabled: false },
    { day: "Wednesday", price: "0.00", enabled: false },
    { day: "Thursday", price: "0.00", enabled: false },
    { day: "Friday", price: "0.00", enabled: false },
    { day: "Saturday", price: "0.00", enabled: true },
    { day: "Sunday", price: "0.00", enabled: false },
  ]);
  const [useMondayPrices, setUseMondayPrices] = useState(true);
  const [useSaturdayPrices, setUseSaturdayPrices] = useState(true);
  const [timeSlotPricing, setTimeSlotPricing] = useState<{
    [key: string]: { [key: string]: string };
  }>({
    Monday: {},
    Saturday: {},
  });

  const { toast } = useToast();

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: timeSlotsData = [], isLoading } = useQuery({
    queryKey: ["/api/time-slots", { date: selectedDate }],
    queryFn: async () => {
      const response = await fetch(`/api/time-slots?date=${selectedDate}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch time slots");
      return response.json();
    },
  });

  const addSlotForm = useForm<TimeSlotFormData>({
    resolver: zodResolver(insertTimeSlotSchema),
    defaultValues: {
      courtId: 0,
      date: selectedDate,
      startTime: "",
      endTime: "",
      price: "0",
      isAvailable: true,
    },
  });

  const addCourtForm = useForm<CourtFormData>({
    resolver: zodResolver(insertCourtSchema),
    defaultValues: {
      name: "",
      description: "",
      hourlyRate: "0",
      isActive: true,
    },
  });

  const addSlotMutation = useMutation({
    mutationFn: async (slotData: TimeSlotFormData) => {
      const response = await apiRequest("POST", "/api/time-slots", slotData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Time Slot Added",
        description: "Time slot has been successfully added.",
      });
      setIsAddSlotDialogOpen(false);
      addSlotForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/time-slots"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCourtMutation = useMutation({
    mutationFn: async (courtData: CourtFormData) => {
      const response = await apiRequest("POST", "/api/courts", courtData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Court Added",
        description: "Court has been successfully added.",
      });
      setIsAddCourtDialogOpen(false);
      handleResetCourtForm();
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/time-slots/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Time Slot Deleted",
        description: "Time slot has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-slots"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate time options from 6:00 to 23:30 in 30-minute intervals
  const generateTimeOptions = () => {
    const times = [];

    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push(timeStr);
      }
    }

    return times;
  };

  // Generate closing time options (includes 00:00 for midnight)
  const generateClosingTimeOptions = () => {
    const times = [];

    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push(timeStr);
      }
    }

    // Add 00:00 at the end for closing time only
    times.push("00:00");

    return times;
  };

  const timeOptions = generateTimeOptions();
  const closingTimeOptions = generateClosingTimeOptions();

  // Generate time slots based on open and close time
  const generateTimeSlots = () => {
    if (!openTime || !closeTime) return [];

    const slots = [];
    const startHour = parseInt(openTime.split(":")[0]);
    const startMinute = parseInt(openTime.split(":")[1]);
    let endHour = parseInt(closeTime.split(":")[0]);
    const endMinute = parseInt(closeTime.split(":")[1]);

    // If close time is 00:00, treat it as 24:00 (midnight next day)
    if (endHour === 0 && endMinute === 0) {
      endHour = 24;
    }

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      // Calculate next time slot (30 minutes later)
      let nextHour = currentHour;
      let nextMinute = currentMinute + 30;

      if (nextMinute >= 60) {
        nextHour += 1;
        nextMinute = 0;
      }

      const startTime = `${currentHour
        .toString()
        .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

      // Handle display of end time (24:00 should show as 00:00)
      const displayEndHour = nextHour === 24 ? 0 : nextHour;
      const endTime = `${displayEndHour
        .toString()
        .padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;

      // Only add slot if it doesn't exceed the closing time
      if (
        nextHour < endHour ||
        (nextHour === endHour && nextMinute <= endMinute)
      ) {
        slots.push({ startTime, endTime });
      }

      // Move to next slot
      currentHour = nextHour;
      currentMinute = nextMinute;
    }

    return slots;
  };

  // Generate time slots for pricing based on actual court hours
  const generatePricingTimeSlots = () => {
    if (!openTime || !closeTime) return [];

    const slots = [];
    const startHour = parseInt(openTime.split(":")[0]);
    const startMinute = parseInt(openTime.split(":")[1]);
    let endHour = parseInt(closeTime.split(":")[0]);
    const endMinute = parseInt(closeTime.split(":")[1]);

    // If close time is 00:00, treat it as 24:00 (midnight next day)
    if (endHour === 0 && endMinute === 0) {
      endHour = 24;
    }

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      // Calculate next time slot (30 minutes later)
      let nextHour = currentHour;
      let nextMinute = currentMinute + 30;

      if (nextMinute >= 60) {
        nextHour += 1;
        nextMinute = 0;
      }

      // Handle display of times (24:00 should show as 00:00)
      const displayCurrentHour = currentHour === 24 ? 0 : currentHour;
      const displayNextHour = nextHour === 24 ? 0 : nextHour;

      const timeSlot = `${displayCurrentHour
        .toString()
        .padStart(2, "0")}:${currentMinute
        .toString()
        .padStart(2, "0")}-${displayNextHour
        .toString()
        .padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;

      // Only add slot if it doesn't exceed the closing time
      if (
        nextHour < endHour ||
        (nextHour === endHour && nextMinute <= endMinute)
      ) {
        slots.push(timeSlot);
      }

      // Move to next slot
      currentHour = nextHour;
      currentMinute = nextMinute;
    }

    return slots;
  };

  const pricingTimeSlots = generatePricingTimeSlots();

  const handlePriceChange = (dayIndex: number, newPrice: string) => {
    const updatedPricing = [...dayPricing];
    updatedPricing[dayIndex].price = newPrice;

    // Auto-apply Monday prices to Tuesday-Friday only if useMondayPrices is true
    if (dayIndex === 0 && updatedPricing[0].enabled && useMondayPrices) {
      // Monday
      for (let i = 1; i <= 4; i++) {
        // Tuesday to Friday
        updatedPricing[i].price = newPrice;
      }
    }

    // Auto-apply Saturday prices to Sunday only if useSaturdayPrices is true
    if (dayIndex === 5 && updatedPricing[5].enabled && useSaturdayPrices) {
      // Saturday
      updatedPricing[6].price = newPrice; // Sunday
    }

    setDayPricing(updatedPricing);
  };

  const handleEnabledChange = (dayIndex: number, enabled: boolean) => {
    const updatedPricing = [...dayPricing];
    updatedPricing[dayIndex].enabled = enabled;

    // If enabling Monday and useMondayPrices is true, apply its price to Tuesday-Friday
    if (dayIndex === 0 && enabled && useMondayPrices) {
      for (let i = 1; i <= 4; i++) {
        updatedPricing[i].price = updatedPricing[0].price;
      }
    }

    // If enabling Saturday and useSaturdayPrices is true, apply its price to Sunday
    if (dayIndex === 5 && enabled && useSaturdayPrices) {
      updatedPricing[6].price = updatedPricing[5].price;
    }

    setDayPricing(updatedPricing);
  };

  const handleMondayPricesToggle = (checked: boolean) => {
    setUseMondayPrices(checked);

    if (checked && dayPricing[0].enabled) {
      // Apply Monday prices to Tuesday-Friday
      const updatedPricing = [...dayPricing];
      for (let i = 1; i <= 4; i++) {
        updatedPricing[i].price = updatedPricing[0].price;
      }
      setDayPricing(updatedPricing);
    }
  };

  const handleSaturdayPricesToggle = (checked: boolean) => {
    setUseSaturdayPrices(checked);

    if (checked && dayPricing[5].enabled) {
      // Apply Saturday prices to Sunday
      const updatedPricing = [...dayPricing];
      updatedPricing[6].price = updatedPricing[5].price;
      setDayPricing(updatedPricing);
    }
  };

  const handleTimeSlotPriceChange = (
    day: string,
    timeSlot: string,
    price: string
  ) => {
    setTimeSlotPricing((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeSlot]: price,
      },
    }));
  };

  const handleAddSlot = (data: TimeSlotFormData) => {
    addSlotMutation.mutate({
      ...data,
      courtId: parseInt(data.courtId.toString()),
    });
  };

  const handleAddCourt = async () => {
    if (!courtName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a court name.",
        variant: "destructive",
      });
      return;
    }

    if (!openTime || !closeTime) {
      toast({
        title: "Error",
        description: "Please select open and close times.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare pricing rules
      const pricingRules = [];

      // Process Monday pricing
      if (dayPricing[0].enabled) {
        for (const [timeSlot, price] of Object.entries(
          timeSlotPricing.Monday
        )) {
          if (price) {
            pricingRules.push({
              dayOfWeek: 1, // Monday
              timeSlot,
              price,
            });
          }
        }
      }

      // Process Saturday pricing
      if (dayPricing[5].enabled) {
        for (const [timeSlot, price] of Object.entries(
          timeSlotPricing.Saturday
        )) {
          if (price) {
            pricingRules.push({
              dayOfWeek: 6, // Saturday
              timeSlot,
              price,
            });
          }
        }
      }

      // If using Monday prices for Tue-Fri, create those rules
      if (useMondayPrices && dayPricing[0].enabled) {
        for (let day = 2; day <= 5; day++) {
          // Tue-Fri
          for (const [timeSlot, price] of Object.entries(
            timeSlotPricing.Monday
          )) {
            if (price) {
              pricingRules.push({
                dayOfWeek: day,
                timeSlot,
                price,
              });
            }
          }
        }
      }

      // If using Saturday prices for Sunday, create those rules
      if (useSaturdayPrices && dayPricing[5].enabled) {
        for (const [timeSlot, price] of Object.entries(
          timeSlotPricing.Saturday
        )) {
          if (price) {
            pricingRules.push({
              dayOfWeek: 0, // Sunday
              timeSlot,
              price,
            });
          }
        }
      }

      // Create court with pricing rules
      const courtData: CourtFormData = {
        name: courtName,
        description: `Open ${openTime} - ${closeTime}`,
        openTime,
        closeTime,
        hourlyRate: dayPricing[0].price || "0",
        isActive: true,
        pricingRules,
      };

      await addCourtMutation.mutateAsync(courtData);

      toast({
        title: "Court Added",
        description: "Court and pricing rules have been successfully added.",
      });
      setIsAddCourtDialogOpen(false);
      handleResetCourtForm();
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-rules"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResetCourtForm = () => {
    setCourtName("");
    setOpenTime("");
    setCloseTime("");
    setUseMondayPrices(true);
    setUseSaturdayPrices(true);
    setDayPricing([
      { day: "Monday", price: "0.00", enabled: true },
      { day: "Tuesday", price: "0.00", enabled: false },
      { day: "Wednesday", price: "0.00", enabled: false },
      { day: "Thursday", price: "0.00", enabled: false },
      { day: "Friday", price: "0.00", enabled: false },
      { day: "Saturday", price: "0.00", enabled: true },
      { day: "Sunday", price: "0.00", enabled: false },
    ]);
    setTimeSlotPricing({
      Monday: {},
      Saturday: {},
    });
  };

  const handleDeleteSlot = (id: number) => {
    if (window.confirm("Are you sure you want to delete this time slot?")) {
      deleteSlotMutation.mutate(id);
    }
  };

  const handleViewCourt = async (court: Court) => {
    setSelectedCourt(court);

    // Parse court data to populate the form
    const workingHours = court.description.match(
      /Open (\d{2}:\d{2}) - (\d{2}:\d{2})/
    );
    if (workingHours) {
      setOpenTime(workingHours[1]);
      setCloseTime(workingHours[2]);
    } else {
      // If no working hours in description, use the actual open/close times
      setOpenTime(court.openTime);
      setCloseTime(court.closeTime);
    }
    setCourtName(court.name);

    try {
      // Fetch pricing rules for this court
      const response = await fetch(`/api/pricing-rules?courtId=${court.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch pricing rules");
      const pricingRules = await response.json();

      // Initialize pricing state
      const mondayPricing: Record<string, string> = {};
      const saturdayPricing: Record<string, string> = {};
      const enabledDays = new Set<number>();

      // Process pricing rules
      pricingRules.forEach((rule: any) => {
        const timeSlot = rule.timeSlot;
        const price = rule.price;
        const dayOfWeek = rule.dayOfWeek;

        // Store pricing for Monday and Saturday
        if (dayOfWeek === 1) {
          // Monday
          mondayPricing[timeSlot] = price;
          enabledDays.add(1);
        } else if (dayOfWeek === 6) {
          // Saturday
          saturdayPricing[timeSlot] = price;
          enabledDays.add(6);
        }
      });

      // Determine if Monday prices are used for Tue-Fri
      const useMondayForWeekdays = pricingRules.some(
        (rule: any) => rule.dayOfWeek >= 2 && rule.dayOfWeek <= 5
      );

      // Determine if Saturday prices are used for Sunday
      const useSaturdayForSunday = pricingRules.some(
        (rule: any) => rule.dayOfWeek === 0
      );

      // Update state
      setTimeSlotPricing({
        Monday: mondayPricing,
        Saturday: saturdayPricing,
      });
      setUseMondayPrices(useMondayForWeekdays);
      setUseSaturdayPrices(useSaturdayForSunday);

      // Set day pricing with actual prices from pricing rules
      const dayPricingData = [
        {
          day: "Monday",
          price: Object.values(mondayPricing)[0] || court.hourlyRate,
          enabled: enabledDays.has(1),
        },
        {
          day: "Tuesday",
          price: useMondayForWeekdays
            ? Object.values(mondayPricing)[0] || court.hourlyRate
            : court.hourlyRate,
          enabled: enabledDays.has(2),
        },
        {
          day: "Wednesday",
          price: useMondayForWeekdays
            ? Object.values(mondayPricing)[0] || court.hourlyRate
            : court.hourlyRate,
          enabled: enabledDays.has(3),
        },
        {
          day: "Thursday",
          price: useMondayForWeekdays
            ? Object.values(mondayPricing)[0] || court.hourlyRate
            : court.hourlyRate,
          enabled: enabledDays.has(4),
        },
        {
          day: "Friday",
          price: useMondayForWeekdays
            ? Object.values(mondayPricing)[0] || court.hourlyRate
            : court.hourlyRate,
          enabled: enabledDays.has(5),
        },
        {
          day: "Saturday",
          price: Object.values(saturdayPricing)[0] || court.hourlyRate,
          enabled: enabledDays.has(6),
        },
        {
          day: "Sunday",
          price: useSaturdayForSunday
            ? Object.values(saturdayPricing)[0] || court.hourlyRate
            : court.hourlyRate,
          enabled: enabledDays.has(0),
        },
      ];

      setDayPricing(dayPricingData);
      setIsViewCourtDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load court pricing rules: " + error.message,
        variant: "destructive",
      });
    }
  };

  const generatePriceRanges = (court: Court) => {
    // Generate sample price ranges based on time slots
    // In a real app, this would come from stored court pricing data
    const basePrice = parseFloat(court.hourlyRate);
    const ranges = [
      { time: "7:00-11:00", price: basePrice },
      { time: "11:00-16:30", price: basePrice + 6 },
      { time: "16:30-20:00", price: basePrice + 10 },
      { time: "20:00-23:00", price: basePrice + 3 },
    ];
    return ranges;
  };

  const generatedTimeSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      <style>{numberInputStyles}</style>
      {/* Courts Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Courts</CardTitle>
            <Dialog
              open={isAddCourtDialogOpen}
              onOpenChange={setIsAddCourtDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Court
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Court</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Court Name */}
                  <div>
                    <Label htmlFor="court-name">Court Name</Label>
                    <Input
                      id="court-name"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      placeholder="Enter court name"
                    />
                  </div>

                  {/* Open and Close Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="open-time">Open Time</Label>
                      <Select value={openTime} onValueChange={setOpenTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select open time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`open-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="close-time">Close Time</Label>
                      <Select value={closeTime} onValueChange={setCloseTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select close time" />
                        </SelectTrigger>
                        <SelectContent>
                          {closingTimeOptions.map((time) => (
                            <SelectItem key={`close-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Time Slots Preview */}
                  {generatedTimeSlots.length > 0 && (
                    <div>
                      <Label>
                        Generated Time Slots ({openTime} - {closeTime})
                      </Label>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          {generatedTimeSlots.map(
                            (
                              slot: { startTime: string; endTime: string },
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="bg-white p-2 rounded border text-center"
                              >
                                {slot.startTime} - {slot.endTime}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weekly Pricing */}
                  <div>
                    <Label>Weekly Pricing</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      Set individual prices for each time slot on Monday and
                      Saturday. Other days will automatically follow the pricing
                      rules.
                    </p>

                    {/* Pricing Control Options */}
                    <div className="flex justify-center space-x-8 mb-6">
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Checkbox
                          checked={useMondayPrices}
                          onCheckedChange={(checked) =>
                            handleMondayPricesToggle(checked as boolean)
                          }
                          className="w-6 h-6 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <span className="text-lg font-medium text-gray-700">
                          Apply Monday prices to Tue-Fri
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Checkbox
                          checked={useSaturdayPrices}
                          onCheckedChange={(checked) =>
                            handleSaturdayPricesToggle(checked as boolean)
                          }
                          className="w-6 h-6 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <span className="text-lg font-medium text-gray-700">
                          Apply Saturday prices to Sunday
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dayPricing.map((day, index) => {
                        const isMonday = index === 0;
                        const isSaturday = index === 5;
                        const isWeekday = index >= 1 && index <= 4; // Tue-Fri
                        const isSunday = index === 6;
                        const isBlurred = isWeekday || isSunday;
                        const canEditManually =
                          (isWeekday && !useMondayPrices) ||
                          (isSunday && !useSaturdayPrices);

                        return (
                          <div key={day.day}>
                            <div
                              className={`border rounded-lg p-4 ${
                                isBlurred && !canEditManually
                                  ? "opacity-50 blur-[1px]"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-20 text-lg font-bold text-gray-900">
                                    {day.day}
                                  </div>
                                </div>

                                {((isWeekday && useMondayPrices) ||
                                  (isSunday && useSaturdayPrices)) && (
                                  <div className="text-sm text-blue-600 font-medium">
                                    Auto-applied from{" "}
                                    {isWeekday ? "Monday" : "Saturday"}
                                  </div>
                                )}
                              </div>

                              {/* Time Slot Pricing Grid - Show for all days */}
                              {!(
                                (isWeekday && useMondayPrices) ||
                                (isSunday && useSaturdayPrices)
                              ) && (
                                <div className="mt-4">
                                  <p className="text-sm font-medium text-gray-700 mb-3">
                                    Set prices for each time slot:
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {pricingTimeSlots.map((timeSlot) => (
                                      <div
                                        key={timeSlot}
                                        className="flex items-center gap-2"
                                      >
                                        <Label className="text-xs text-gray-600 whitespace-nowrap">
                                          {timeSlot}
                                        </Label>
                                        <div className="flex items-center">
                                          <span className="text-xs text-gray-500 mr-1">
                                            €
                                          </span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={
                                              timeSlotPricing[day.day]?.[
                                                timeSlot
                                              ] || ""
                                            }
                                            onChange={(e) =>
                                              handleTimeSlotPriceChange(
                                                day.day,
                                                timeSlot,
                                                e.target.value
                                              )
                                            }
                                            placeholder="0.00"
                                            className={`text-xs h-8 w-20 ${
                                              (isWeekday && useMondayPrices) ||
                                              (isSunday && useSaturdayPrices)
                                                ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                                : ""
                                            }`}
                                            disabled={
                                              (isWeekday && useMondayPrices) ||
                                              (isSunday && useSaturdayPrices)
                                            }
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Show auto-applied message for days that inherit pricing */}
                              {((isWeekday && useMondayPrices) ||
                                (isSunday && useSaturdayPrices)) && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                  <p className="text-sm text-blue-700">
                                    Pricing automatically applied from{" "}
                                    {isWeekday ? "Monday" : "Saturday"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddCourtDialogOpen(false);
                        handleResetCourtForm();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddCourt}
                      disabled={addCourtMutation.isPending}
                      className="flex-1"
                    >
                      {addCourtMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add Court"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Court Selection */}
          <div className="mb-6">
            <Label htmlFor="court-select">Select Court</Label>
            <Select
              value={selectedCourt?.id?.toString() || ""}
              onValueChange={async (value: string) => {
                const court = courts.find((c) => c.id.toString() === value);
                if (court) {
                  setSelectedCourt(court);
                  // Parse working hours
                  const workingHours = court.description.match(
                    /Open (\d{2}:\d{2}) - (\d{2}:\d{2})/
                  );
                  if (workingHours) {
                    setOpenTime(workingHours[1]);
                    setCloseTime(workingHours[2]);
                  } else {
                    setOpenTime(court.openTime);
                    setCloseTime(court.closeTime);
                  }
                  setCourtName(court.name);
                  try {
                    // Fetch pricing rules for this court
                    const response = await fetch(
                      `/api/pricing-rules?courtId=${court.id}`,
                      {
                        credentials: "include",
                      }
                    );
                    if (!response.ok)
                      throw new Error("Failed to fetch pricing rules");
                    const pricingRules = await response.json();
                    // Initialize pricing state
                    const mondayPricing: Record<string, string> = {};
                    const saturdayPricing: Record<string, string> = {};
                    const enabledDays = new Set<number>();
                    // Process pricing rules
                    pricingRules.forEach((rule: any) => {
                      const timeSlot = rule.timeSlot;
                      const price = rule.price;
                      const dayOfWeek = rule.dayOfWeek;
                      if (dayOfWeek === 1) {
                        mondayPricing[timeSlot] = price;
                        enabledDays.add(1);
                      } else if (dayOfWeek === 6) {
                        saturdayPricing[timeSlot] = price;
                        enabledDays.add(6);
                      }
                    });
                    // Determine if Monday prices are used for Tue-Fri
                    const useMondayForWeekdays = pricingRules.some(
                      (rule: any) => rule.dayOfWeek >= 2 && rule.dayOfWeek <= 5
                    );
                    // Determine if Saturday prices are used for Sunday
                    const useSaturdayForSunday = pricingRules.some(
                      (rule: any) => rule.dayOfWeek === 0
                    );
                    setTimeSlotPricing({
                      Monday: mondayPricing,
                      Saturday: saturdayPricing,
                    });
                    setUseMondayPrices(useMondayForWeekdays);
                    setUseSaturdayPrices(useSaturdayForSunday);
                    // Set day pricing with actual prices from pricing rules
                    const dayPricingData = [
                      {
                        day: "Monday",
                        price:
                          Object.values(mondayPricing)[0] || court.hourlyRate,
                        enabled: enabledDays.has(1),
                      },
                      {
                        day: "Tuesday",
                        price: useMondayForWeekdays
                          ? Object.values(mondayPricing)[0] || court.hourlyRate
                          : court.hourlyRate,
                        enabled: enabledDays.has(2),
                      },
                      {
                        day: "Wednesday",
                        price: useMondayForWeekdays
                          ? Object.values(mondayPricing)[0] || court.hourlyRate
                          : court.hourlyRate,
                        enabled: enabledDays.has(3),
                      },
                      {
                        day: "Thursday",
                        price: useMondayForWeekdays
                          ? Object.values(mondayPricing)[0] || court.hourlyRate
                          : court.hourlyRate,
                        enabled: enabledDays.has(4),
                      },
                      {
                        day: "Friday",
                        price: useMondayForWeekdays
                          ? Object.values(mondayPricing)[0] || court.hourlyRate
                          : court.hourlyRate,
                        enabled: enabledDays.has(5),
                      },
                      {
                        day: "Saturday",
                        price:
                          Object.values(saturdayPricing)[0] || court.hourlyRate,
                        enabled: enabledDays.has(6),
                      },
                      {
                        day: "Sunday",
                        price: useSaturdayForSunday
                          ? Object.values(saturdayPricing)[0] ||
                            court.hourlyRate
                          : court.hourlyRate,
                        enabled: enabledDays.has(0),
                      },
                    ];
                    setDayPricing(dayPricingData);
                  } catch (error: any) {
                    // Optionally show a toast or error
                  }
                }
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a court" />
              </SelectTrigger>
              <SelectContent>
                {courts.map((court) => (
                  <SelectItem key={court.id} value={court.id.toString()}>
                    {court.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Court Details */}
          {selectedCourt && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedCourt.name}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Working Hours: {selectedCourt.openTime} -{" "}
                    {selectedCourt.closeTime}
                  </p>
                </div>
                <Button
                  onClick={() => setIsViewCourtDialogOpen(true)}
                  variant="outline"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Court
                </Button>
              </div>

              {/* Time Slots and Pricing Table */}
              <div className="overflow-x-auto">
                <div className="grid grid-cols-4 gap-8">
                  {/* Define time slot groups */}
                  {[
                    {
                      label: "Morning",
                      times: [
                        "06:00",
                        "06:30",
                        "07:00",
                        "07:30",
                        "08:00",
                        "08:30",
                        "09:00",
                        "09:30",
                        "10:00",
                        "10:30",
                        "11:00",
                        "11:30",
                      ],
                    },
                    {
                      label: "Afternoon",
                      times: [
                        "12:00",
                        "12:30",
                        "13:00",
                        "13:30",
                        "14:00",
                        "14:30",
                        "15:00",
                        "15:30",
                        "16:00",
                        "16:30",
                      ],
                    },
                    {
                      label: "Peak Hours",
                      times: [
                        "17:00",
                        "17:30",
                        "18:00",
                        "18:30",
                        "19:00",
                        "19:30",
                        "20:00",
                        "20:30",
                        "21:00",
                        "21:30",
                        "22:00",
                        "22:30",
                        "23:00",
                        "23:30",
                      ],
                    },
                  ].map((group) => (
                    <div key={group.label}>
                      <div className="font-semibold mb-2">{group.label}</div>
                      {group.times.map((start) => {
                        // Find the corresponding time slot (e.g. '06:00-06:30')
                        const startHour = parseInt(start.split(":")[0], 10);
                        const startMinute = parseInt(start.split(":")[1], 10);
                        let endHour = startHour;
                        let endMinute = startMinute + 30;
                        if (endMinute >= 60) {
                          endHour += 1;
                          endMinute = 0;
                        }
                        const displayEndHour = endHour === 24 ? 0 : endHour;
                        const end = `${displayEndHour
                          .toString()
                          .padStart(2, "0")}:${endMinute
                          .toString()
                          .padStart(2, "0")}`;
                        const slotKey = `${start}-${end}`;
                        // Use Monday as default for display, or fallback to any enabled day
                        const day = dayPricing[0]?.enabled
                          ? "Monday"
                          : dayPricing.find((d) => d.enabled)?.day || "Monday";
                        const price = timeSlotPricing[day]?.[slotKey] || "0.00";
                        return (
                          <div key={slotKey} className="flex items-center mb-2">
                            <span className="w-24 text-sm">{slotKey}</span>
                            <div className="relative w-24">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                €
                              </span>
                              <input
                                type="number"
                                value={price}
                                readOnly
                                className="pl-5 pr-2 py-1 w-full border rounded text-xs bg-gray-50 appearance-none focus:outline-none"
                                style={{ MozAppearance: "textfield" }}
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Management</CardTitle>
            <Dialog
              open={isAddSlotDialogOpen}
              onOpenChange={setIsAddSlotDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Time Slot</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={addSlotForm.handleSubmit(handleAddSlot)}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="slot-date">Date</Label>
                    <Input
                      id="slot-date"
                      type="date"
                      {...addSlotForm.register("date")}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="slot-start">Start Time</Label>
                      <Input
                        id="slot-start"
                        type="time"
                        {...addSlotForm.register("startTime")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="slot-end">End Time</Label>
                      <Input
                        id="slot-end"
                        type="time"
                        {...addSlotForm.register("endTime")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="slot-court">Court</Label>
                    <Select
                      onValueChange={(value) =>
                        addSlotForm.setValue("courtId", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select court" />
                      </SelectTrigger>
                      <SelectContent>
                        {courts.map((court) => (
                          <SelectItem
                            key={court.id}
                            value={court.id.toString()}
                          >
                            {court.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="slot-price">Price (€)</Label>
                    <Input
                      id="slot-price"
                      type="number"
                      step="0.01"
                      {...addSlotForm.register("price")}
                      placeholder="Enter price in euros"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddSlotDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addSlotMutation.isPending}
                      className="flex-1"
                    >
                      {addSlotMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add Time Slot"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date Filter */}
          <div className="mb-6">
            <Label htmlFor="filter-date">Filter by Date</Label>
            <Input
              id="filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Time Slots Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlotsData.map((slot: any) => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      {format(new Date(slot.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {slot.startTime} - {slot.endTime}
                    </TableCell>
                    <TableCell>{slot.court.name}</TableCell>
                    <TableCell>€{slot.price}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          slot.isAvailable
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {slot.isAvailable ? "Available" : "Booked"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Court Dialog */}
      <Dialog
        open={isViewCourtDialogOpen}
        onOpenChange={setIsViewCourtDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Court Details - {selectedCourt?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Court Name */}
            <div>
              <Label htmlFor="view-court-name">Court Name</Label>
              <Input
                id="view-court-name"
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                placeholder="Enter court name"
              />
            </div>

            {/* Open and Close Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="view-open-time">Open Time</Label>
                <Select value={openTime} onValueChange={setOpenTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select open time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`view-open-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="view-close-time">Close Time</Label>
                <Select value={closeTime} onValueChange={setCloseTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select close time" />
                  </SelectTrigger>
                  <SelectContent>
                    {closingTimeOptions.map((time) => (
                      <SelectItem key={`view-close-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Slots Preview */}
            {generatedTimeSlots.length > 0 && (
              <div>
                <Label>
                  Generated Time Slots ({openTime} - {closeTime})
                </Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    {generatedTimeSlots.map(
                      (
                        slot: { startTime: string; endTime: string },
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="bg-white p-2 rounded border text-center"
                        >
                          {slot.startTime} - {slot.endTime}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Pricing */}
            <div>
              <Label>Weekly Pricing</Label>
              <p className="text-sm text-gray-600 mb-4">
                Set individual prices for each time slot on Monday and Saturday.
                Other days will automatically follow the pricing rules.
              </p>

              {/* Pricing Control Options */}
              <div className="flex justify-center space-x-8 mb-6">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Checkbox
                    checked={useMondayPrices}
                    onCheckedChange={(checked) =>
                      handleMondayPricesToggle(checked as boolean)
                    }
                    className="w-6 h-6 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <span className="text-lg font-medium text-gray-700">
                    Apply Monday prices to Tue-Fri
                  </span>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Checkbox
                    checked={useSaturdayPrices}
                    onCheckedChange={(checked) =>
                      handleSaturdayPricesToggle(checked as boolean)
                    }
                    className="w-6 h-6 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <span className="text-lg font-medium text-gray-700">
                    Apply Saturday prices to Sunday
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {dayPricing.map((day, index) => {
                  const isMonday = index === 0;
                  const isSaturday = index === 5;
                  const isWeekday = index >= 1 && index <= 4; // Tue-Fri
                  const isSunday = index === 6;
                  const isBlurred = isWeekday || isSunday;
                  const canEditManually =
                    (isWeekday && !useMondayPrices) ||
                    (isSunday && !useSaturdayPrices);

                  return (
                    <div key={day.day}>
                      <div
                        className={`border rounded-lg p-4 ${
                          isBlurred && !canEditManually
                            ? "opacity-50 blur-[1px]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-20 text-lg font-bold text-gray-900">
                              {day.day}
                            </div>
                          </div>

                          {((isWeekday && useMondayPrices) ||
                            (isSunday && useSaturdayPrices)) && (
                            <div className="text-sm text-blue-600 font-medium">
                              Auto-applied from{" "}
                              {isWeekday ? "Monday" : "Saturday"}
                            </div>
                          )}
                        </div>

                        {/* Time Slot Pricing Grid - Show for all days */}
                        {!(
                          (isWeekday && useMondayPrices) ||
                          (isSunday && useSaturdayPrices)
                        ) && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              Set prices for each time slot:
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {pricingTimeSlots.map((timeSlot) => (
                                <div
                                  key={timeSlot}
                                  className="flex items-center gap-2"
                                >
                                  <Label className="text-xs text-gray-600 whitespace-nowrap">
                                    {timeSlot}
                                  </Label>
                                  <div className="flex items-center">
                                    <span className="text-xs text-gray-500 mr-1">
                                      €
                                    </span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={
                                        timeSlotPricing[day.day]?.[timeSlot] ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleTimeSlotPriceChange(
                                          day.day,
                                          timeSlot,
                                          e.target.value
                                        )
                                      }
                                      placeholder="0.00"
                                      className={`text-xs h-8 w-20 ${
                                        (isWeekday && useMondayPrices) ||
                                        (isSunday && useSaturdayPrices)
                                          ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                          : ""
                                      }`}
                                      disabled={
                                        (isWeekday && useMondayPrices) ||
                                        (isSunday && useSaturdayPrices)
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show auto-applied message for days that inherit pricing */}
                        {((isWeekday && useMondayPrices) ||
                          (isSunday && useSaturdayPrices)) && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                              Pricing automatically applied from{" "}
                              {isWeekday ? "Monday" : "Saturday"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsViewCourtDialogOpen(false);
                  handleResetCourtForm();
                }}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    if (!selectedCourt) return;

                    // Update court basic info
                    const courtData: Partial<CourtFormData> = {
                      name: courtName,
                      description: `Open ${openTime} - ${closeTime}`,
                      hourlyRate: dayPricing[0].price || "0",
                    };

                    await apiRequest(
                      "PUT",
                      `/api/courts/${selectedCourt.id}`,
                      courtData
                    );

                    // Prepare pricing updates
                    const pricingUpdates = [];

                    // Process Monday pricing
                    if (dayPricing[0].enabled) {
                      for (const [timeSlot, price] of Object.entries(
                        timeSlotPricing.Monday
                      )) {
                        if (price) {
                          pricingUpdates.push({
                            courtId: selectedCourt.id,
                            timeSlot,
                            price,
                            dayOfWeek: 1, // Monday
                          });
                        }
                      }
                    }

                    // Process Saturday pricing
                    if (dayPricing[5].enabled) {
                      for (const [timeSlot, price] of Object.entries(
                        timeSlotPricing.Saturday
                      )) {
                        if (price) {
                          pricingUpdates.push({
                            courtId: selectedCourt.id,
                            timeSlot,
                            price,
                            dayOfWeek: 6, // Saturday
                          });
                        }
                      }
                    }

                    // If using Monday prices for Tue-Fri, create those rules
                    if (useMondayPrices && dayPricing[0].enabled) {
                      for (let day = 2; day <= 5; day++) {
                        // Tue-Fri
                        for (const [timeSlot, price] of Object.entries(
                          timeSlotPricing.Monday
                        )) {
                          if (price) {
                            pricingUpdates.push({
                              courtId: selectedCourt.id,
                              timeSlot,
                              price,
                              dayOfWeek: day,
                            });
                          }
                        }
                      }
                    }

                    // If using Saturday prices for Sunday, create those rules
                    if (useSaturdayPrices && dayPricing[5].enabled) {
                      for (const [timeSlot, price] of Object.entries(
                        timeSlotPricing.Saturday
                      )) {
                        if (price) {
                          pricingUpdates.push({
                            courtId: selectedCourt.id,
                            timeSlot,
                            price,
                            dayOfWeek: 0, // Sunday
                          });
                        }
                      }
                    }

                    // Save all pricing rules
                    if (pricingUpdates.length > 0) {
                      await apiRequest("POST", "/api/pricing-rules/batch", {
                        updates: pricingUpdates,
                      });
                    }

                    toast({
                      title: "Court Updated",
                      description:
                        "Court details and pricing rules have been updated successfully.",
                    });
                    setIsViewCourtDialogOpen(false);
                    handleResetCourtForm();
                    queryClient.invalidateQueries({
                      queryKey: ["/api/courts"],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["/api/pricing-rules"],
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-1"
              >
                Update Court
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
