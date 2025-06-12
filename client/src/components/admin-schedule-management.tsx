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

type TimeSlotFormData = z.infer<typeof insertTimeSlotSchema>;
type CourtFormData = z.infer<typeof insertCourtSchema>;

interface Court {
  id: number;
  name: string;
  description: string;
  hourlyRate: string;
  isActive: boolean;
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
    // Add 00:00 at the beginning
    times.push("00:00");

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

  const timeOptions = generateTimeOptions();

  // Generate time slots based on open and close time
  const generateTimeSlots = () => {
    if (!openTime || !closeTime) return [];

    const slots = [];
    const startHour = parseInt(openTime.split(":")[0]);
    const startMinute = parseInt(openTime.split(":")[1]);
    const endHour = parseInt(closeTime.split(":")[0]);
    const endMinute = parseInt(closeTime.split(":")[1]);

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
      const endTime = `${nextHour.toString().padStart(2, "0")}:${nextMinute
        .toString()
        .padStart(2, "0")}`;

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
    const endHour = parseInt(closeTime.split(":")[0]);
    const endMinute = parseInt(closeTime.split(":")[1]);

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

      const timeSlot = `${currentHour
        .toString()
        .padStart(2, "0")}:${currentMinute
        .toString()
        .padStart(2, "0")}-${nextHour.toString().padStart(2, "0")}:${nextMinute
        .toString()
        .padStart(2, "0")}`;

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

  const handleAddCourt = () => {
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

    // For now, just add the court with basic info
    // In a real implementation, you'd also save the pricing and time slot info
    const courtData: CourtFormData = {
      name: courtName,
      description: `Open ${openTime} - ${closeTime}`,
      hourlyRate: dayPricing[0].price || "0",
      isActive: true,
    };

    addCourtMutation.mutate(courtData);
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

  const handleViewCourt = (court: Court) => {
    setSelectedCourt(court);
    // Parse court data to populate the form
    const workingHours = court.description.match(
      /Open (\d{2}:\d{2}) - (\d{2}:\d{2})/
    );
    if (workingHours) {
      setOpenTime(workingHours[1]);
      setCloseTime(workingHours[2]);
    }
    setCourtName(court.name);
    // For demo purposes, set some sample pricing data
    // In a real app, you'd fetch this from the backend
    setDayPricing([
      { day: "Monday", price: court.hourlyRate, enabled: true },
      { day: "Tuesday", price: court.hourlyRate, enabled: false },
      { day: "Wednesday", price: court.hourlyRate, enabled: false },
      { day: "Thursday", price: court.hourlyRate, enabled: false },
      { day: "Friday", price: court.hourlyRate, enabled: false },
      {
        day: "Saturday",
        price: (parseFloat(court.hourlyRate) + 5).toString(),
        enabled: true,
      },
      {
        day: "Sunday",
        price: (parseFloat(court.hourlyRate) + 5).toString(),
        enabled: false,
      },
    ]);
    setTimeSlotPricing({
      Monday: {},
      Saturday: {},
    });
    setIsViewCourtDialogOpen(true);
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
                          {timeOptions.map((time) => (
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
                                      <div key={timeSlot} className="space-y-1">
                                        <Label className="text-xs text-gray-600">
                                          {timeSlot}
                                        </Label>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs text-gray-500">
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
                                            className="text-xs h-8"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court) => {
              const priceRanges = generatePriceRanges(court);
              const workingHours = court.description.includes("Open")
                ? court.description.replace("Open ", "")
                : "7:00 - 23:00";

              return (
                <div
                  key={court.id}
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 bg-white"
                  onClick={() => handleViewCourt(court)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-900">
                      {court.name}
                    </h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Working Hours:</span>
                      <span className="ml-2">{workingHours}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Price Ranges:
                    </p>
                    {priceRanges.map((range, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-gray-600">{range.time}</span>
                        <span className="font-semibold text-blue-600">
                          {range.price}€
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                      Click to view details
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
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
                    {timeOptions.map((time) => (
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
                                <div key={timeSlot} className="space-y-1">
                                  <Label className="text-xs text-gray-600">
                                    {timeSlot}
                                  </Label>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-gray-500">
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
                                      className="text-xs h-8"
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
                onClick={() => {
                  // Here you would implement the update court functionality
                  toast({
                    title: "Court Updated",
                    description:
                      "Court details have been updated successfully.",
                  });
                  setIsViewCourtDialogOpen(false);
                  handleResetCourtForm();
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
