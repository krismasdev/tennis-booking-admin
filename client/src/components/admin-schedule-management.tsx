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
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Loader2,
  MapPin,
  Euro,
  Clock,
} from "lucide-react";
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

  const [expandedCourtId, setExpandedCourtId] = useState<number | null>(null);
  const [editingPrices, setEditingPrices] = useState<{
    [courtId: number]: {
      [day: string]: { [slot: string]: string };
    };
  }>({});

  const [courtPricing, setCourtPricing] = useState<{
    [courtId: number]: {
      [day: string]: { [slot: string]: string };
    };
  }>({});

  // Fetch pricing rules for a court when expanded
  const handleExpandCourt = async (court: Court) => {
    if (expandedCourtId === court.id) {
      setExpandedCourtId(null);
      return;
    }
    setExpandedCourtId(court.id);
    // Only fetch if not already loaded
    if (!courtPricing[court.id]) {
      try {
        const response = await fetch(`/api/pricing-rules?courtId=${court.id}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch pricing rules");
        const pricingRules = await response.json();
        // Parse rules into { [day]: { [slot]: price } }
        const newPricing: { [day: string]: { [slot: string]: string } } = {};
        pricingRules.forEach((rule: any) => {
          const day = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][rule.dayOfWeek];
          if (!newPricing[day]) newPricing[day] = {};
          newPricing[day][rule.timeSlot] = rule.price;
        });
        setCourtPricing((prev) => ({ ...prev, [court.id]: newPricing }));
      } catch (e) {
        // Optionally show error
      }
    }
  };

  // Update getCourtSlotPrice to use courtPricing
  const getCourtSlotPrice = (courtId: number, day: string, slot: string) => {
    return (
      editingPrices[courtId]?.[day]?.[slot] ||
      courtPricing[courtId]?.[day]?.[slot] ||
      "0.00"
    );
  };

  // Helper: set price for a court, day, slot
  const setCourtSlotPrice = (
    courtId: number,
    day: string,
    slot: string,
    price: string
  ) => {
    setEditingPrices((prev) => ({
      ...prev,
      [courtId]: {
        ...prev[courtId],
        [day]: {
          ...((prev[courtId] && prev[courtId][day]) || {}),
          [slot]: price,
        },
      },
    }));
  };

  // Days of week
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Time slots (06:00-23:30, 30min intervals)
  const allTimeSlots = (() => {
    const slots = [];
    let currentHour = 6,
      currentMinute = 0;
    while (currentHour < 24) {
      let nextHour = currentHour;
      let nextMinute = currentMinute + 30;
      if (nextMinute >= 60) {
        nextHour += 1;
        nextMinute = 0;
      }
      if (nextHour > 23 || (nextHour === 23 && nextMinute > 30)) break;
      // Always use leading zeros for hours and minutes
      const start = `${currentHour.toString().padStart(2, "0")}:${currentMinute
        .toString()
        .padStart(2, "0")}`;
      const end = `${nextHour.toString().padStart(2, "0")}:${nextMinute
        .toString()
        .padStart(2, "0")}`;
      const slotKey = `${start}-${end}`;
      slots.push(slotKey);
      currentHour = nextHour;
      currentMinute = nextMinute;
    }
    return slots;
  })();

  // Inline editing state for calendar grid
  const [editingCell, setEditingCell] = useState<{
    courtId: number;
    day: string;
    slot: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Helper: start editing a cell
  const startEditCell = (
    courtId: number,
    day: string,
    slot: string,
    value: string
  ) => {
    setEditingCell({ courtId, day, slot });
    setEditingValue(value);
  };
  // Helper: save edit
  const saveEditCell = () => {
    if (editingCell) {
      setCourtSlotPrice(
        editingCell.courtId,
        editingCell.day,
        editingCell.slot,
        editingValue
      );
      setEditingCell(null);
      setEditingValue("");
    }
  };
  // Helper: cancel edit
  const cancelEditCell = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const handleSaveCourtPrices = async (courtId: number) => {
    const updates = [];
    for (const day of daysOfWeek) {
      for (const slot of allTimeSlots) {
        const price = editingPrices[courtId]?.[day]?.[slot];
        if (price !== undefined) {
          // Map UI index to backend dayOfWeek: Monday=1, ..., Saturday=6, Sunday=0
          const uiIndex = daysOfWeek.indexOf(day); // 0=Monday, 6=Sunday
          const dayOfWeek = (uiIndex + 1) % 7; // 1=Monday, ..., 6=Saturday, 0=Sunday
          updates.push({
            courtId,
            dayOfWeek,
            timeSlot: slot.trim(), // Always trim slotKey
            price,
          });
        }
      }
    }
    if (updates.length > 0) {
      await apiRequest("POST", "/api/pricing-rules/batch", { updates });
      // Optionally, refetch pricing for this court and clear editing state
      setCourtPricing((prev) => {
        const newPricing = { ...prev };
        if (!newPricing[courtId]) newPricing[courtId] = {};
        for (const update of updates) {
          // Map backend dayOfWeek back to UI day
          const day = daysOfWeek[(update.dayOfWeek + 6) % 7];
          if (!newPricing[courtId][day]) newPricing[courtId][day] = {};
          newPricing[courtId][day][update.timeSlot.trim()] = update.price;
        }
        return newPricing;
      });
      setEditingPrices((prev) => ({ ...prev, [courtId]: {} }));
    }
  };

  // Helper function to group prices into ranges
  const getPriceRanges = (courtId: number) => {
    const ranges: {
      [key: string]: {
        days: string[];
        timeRanges: { start: string; end: string; price: string }[];
      };
    } = {};

    // First, collect all prices for each day
    daysOfWeek.forEach((day) => {
      const dayPrices: { [key: string]: string } = {};
      allTimeSlots.forEach((slot) => {
        const price = getCourtSlotPrice(courtId, day, slot);
        if (price && price !== "0.00") {
          dayPrices[slot] = price;
        }
      });

      // Group consecutive slots with same price
      let currentPrice = "";
      let startSlot = "";
      let endSlot = "";

      Object.entries(dayPrices).forEach(([slot, price], index, array) => {
        if (currentPrice === "") {
          currentPrice = price;
          startSlot = slot.split("-")[0];
        }

        const isLast = index === array.length - 1;
        const nextSlot = array[index + 1];
        const shouldBreak = isLast || (nextSlot && nextSlot[1] !== price);

        if (shouldBreak) {
          endSlot = slot.split("-")[1];
          const rangeKey = `${startSlot}-${endSlot}-${price}`;

          if (!ranges[rangeKey]) {
            ranges[rangeKey] = {
              days: [],
              timeRanges: [{ start: startSlot, end: endSlot, price }],
            };
          }
          ranges[rangeKey].days.push(day);
          currentPrice = "";
        }
      });
    });

    // Format the ranges for display
    return Object.entries(ranges).map(([key, data]) => {
      const days = data.days;
      let daysText = "";

      // Group consecutive days
      if (
        days.includes("Monday") &&
        days.includes("Tuesday") &&
        days.includes("Wednesday") &&
        days.includes("Thursday") &&
        days.includes("Friday")
      ) {
        daysText = "Mon-Fri";
      } else if (days.includes("Saturday") && days.includes("Sunday")) {
        daysText = "Sat-Sun";
      } else {
        daysText = days.join(", ");
      }

      return {
        days: daysText,
        timeRanges: data.timeRanges.map((range) => ({
          time: `${range.start}-${range.end}`,
          price: range.price,
        })),
      };
    });
  };

  return (
    <div className="space-y-6">
      <style>{numberInputStyles}</style>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Courts Calendar - Weekly View
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-blue-600" />
              <span>Click slots to edit pricing</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header with days */}
              <div className="grid grid-cols-8 gap-1 mb-4">
                <div className="font-medium text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-4 w-4 mx-auto" />
                </div>
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="font-medium text-sm text-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="font-semibold">{day}</div>
                  </div>
                ))}
              </div>

              {/* Court sections */}
              {courts
                .filter((court) => court.isActive)
                .map((court) => (
                  <div key={court.id} className="mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            {court.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {court.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Base Rate</p>
                          <p className="font-bold text-blue-600">
                            €{court.hourlyRate}/hour
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Time slots for this court */}
                    <div className="space-y-1">
                      {allTimeSlots.map((time) => (
                        <div
                          key={`${court.id}-${time}`}
                          className="grid grid-cols-8 gap-1"
                        >
                          <div className="text-sm text-gray-600 p-2 flex items-center justify-center bg-gray-50 rounded font-medium">
                            {time}
                          </div>
                          {daysOfWeek.map((day) => {
                            const price = getCourtSlotPrice(
                              court.id,
                              day,
                              time
                            );
                            const isEditing =
                              editingCell &&
                              editingCell.courtId === court.id &&
                              editingCell.day === day &&
                              editingCell.slot === time;

                            return (
                              <div
                                key={`${court.id}-${day}-${time}`}
                                className={`min-h-[40px] rounded border text-xs p-2 flex flex-col items-center justify-center transition-all duration-200 ${
                                  isEditing
                                    ? "bg-orange-50 border-orange-200"
                                    : "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer"
                                }`}
                                onClick={() => {
                                  if (!isEditing) {
                                    startEditCell(court.id, day, time, price);
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingValue}
                                    autoFocus
                                    min="0"
                                    step="0.01"
                                    className="w-16 text-xs border rounded px-2 py-1 bg-white appearance-none focus:outline-none"
                                    onChange={(e) =>
                                      setEditingValue(e.target.value)
                                    }
                                    onBlur={saveEditCell}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEditCell();
                                      if (e.key === "Escape") cancelEditCell();
                                    }}
                                  />
                                ) : (
                                  <>
                                    <span className="font-semibold truncate text-center">
                                      €{price}
                                    </span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Empty state */}
              {courts.filter((court) => court.isActive).length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Active Courts
                  </h3>
                  <p className="text-gray-600">
                    Add courts in the Courts management section to see them
                    here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
