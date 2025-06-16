import { useState, useEffect } from "react";
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
  X,
  ChevronUp,
  ChevronDown,
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

interface PriceRange {
  startTime: string;
  endTime: string;
  price: string;
  days: string[];
}

interface CourtPricing {
  weekdayRanges: PriceRange[];
  weekendRanges: PriceRange[];
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
    [courtId: number]: CourtPricing;
  }>({});

  const [courtPricing, setCourtPricing] = useState<{
    [courtId: number]: CourtPricing;
  }>({});

  // After courts are loaded, fetch pricing for all courts
  useEffect(() => {
    async function fetchAllCourtPricing() {
      if (!courts || courts.length === 0) return;
      for (const court of courts) {
        if (!courtPricing[court.id]) {
          try {
            const response = await fetch(
              `/api/pricing-rules?courtId=${court.id}`,
              {
                credentials: "include",
              }
            );
            if (!response.ok) throw new Error("Failed to fetch pricing rules");
            const pricingRules = await response.json();

            // Initialize pricing structure
            const newPricing: CourtPricing = {
              weekdayRanges: [],
              weekendRanges: [],
            };

            // Process pricing rules
            pricingRules.forEach((rule: any) => {
              const priceRange = {
                timeSlot: rule.timeSlot,
                price: rule.price,
                days: [rule.dayOfWeek],
              };

              // Add to appropriate ranges based on day
              if (rule.dayOfWeek >= 1 && rule.dayOfWeek <= 5) {
                // Weekdays (Monday-Friday)
                newPricing.weekdayRanges.push(priceRange);
              } else {
                // Weekends (Saturday-Sunday)
                newPricing.weekendRanges.push(priceRange);
              }
            });

            // Sort ranges by time slot
            newPricing.weekdayRanges.sort((a, b) =>
              a.timeSlot.localeCompare(b.timeSlot)
            );
            newPricing.weekendRanges.sort((a, b) =>
              a.timeSlot.localeCompare(b.timeSlot)
            );

            setCourtPricing((prev) => ({ ...prev, [court.id]: newPricing }));
          } catch (e) {
            console.error("Error fetching pricing rules:", e);
          }
        }
      }
    }
    fetchAllCourtPricing();
  }, [courts]);

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
        const newPricing: CourtPricing = {
          weekdayRanges: [],
          weekendRanges: [],
        };
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
          if (!newPricing[day])
            newPricing[day] = { weekdayRanges: [], weekendRanges: [] };
          newPricing[day].weekdayRanges.push({
            startTime: rule.timeSlot.split("-")[0],
            endTime: rule.timeSlot.split("-")[1],
            price: rule.price,
            days: [day],
          });
        });
        setCourtPricing((prev) => ({ ...prev, [court.id]: newPricing }));
      } catch (e) {
        // Optionally show error
      }
    }
  };

  // Helper to get price for a given court, day, and slot
  function getCourtSlotPrice(courtId: number, day: string, slot: string) {
    const pricing = courtPricing[courtId];
    if (!pricing) return "0.00";
    const dayIndex = daysOfWeek.indexOf(day); // 0=Monday, 6=Sunday
    // Mon-Fri: 0-4, Sat:5, Sun:6
    let ranges = [];
    if (dayIndex >= 0 && dayIndex <= 4) {
      ranges = pricing.weekdayRanges;
    } else {
      ranges = pricing.weekendRanges;
    }
    // Try to match the slot
    for (const range of ranges) {
      // Accept both {startTime, endTime} and {timeSlot}
      const rangeSlot = range.timeSlot || `${range.startTime}-${range.endTime}`;
      if (rangeSlot === slot) {
        return range.price;
      }
    }
    return "0.00";
  }

  // Helper to group and format price ranges for summary
  function getPriceRangeSummary(
    courtId: number,
    openTime: string,
    closeTime: string
  ) {
    const pricing = courtPricing[courtId];
    if (!pricing) return { monFri: [], satSun: [] };
    // Helper to group consecutive ranges with same price
    function groupRanges(ranges: any[]) {
      // Sort by start time
      const sorted = [...ranges].sort((a, b) => {
        const aStart = a.startTime || a.timeSlot?.split("-")[0];
        const bStart = b.startTime || b.timeSlot?.split("-")[0];
        return aStart.localeCompare(bStart);
      });
      const result = [];
      let current = null;
      for (const range of sorted) {
        const start = range.startTime || range.timeSlot?.split("-")[0];
        const end = range.endTime || range.timeSlot?.split("-")[1];
        const price = range.price;
        if (!current) {
          current = { start, end, price };
        } else if (current.price === price && current.end === start) {
          // Extend current range
          current.end = end;
        } else {
          result.push({ ...current });
          current = { start, end, price };
        }
      }
      if (current) result.push(current);
      // Filter by open/close
      return result.filter((r) => r.start >= openTime && r.end <= closeTime);
    }
    const monFri = groupRanges(pricing.weekdayRanges);
    const satSun = groupRanges(pricing.weekendRanges);
    return { monFri, satSun };
  }

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
        if (!newPricing[courtId])
          newPricing[courtId] = { weekdayRanges: [], weekendRanges: [] };
        for (const update of updates) {
          // Map backend dayOfWeek back to UI day
          const day = daysOfWeek[(update.dayOfWeek + 6) % 7];
          if (!newPricing[courtId][day])
            newPricing[courtId][day] = { weekdayRanges: [], weekendRanges: [] };
          newPricing[courtId][day].weekdayRanges.push({
            startTime: update.timeSlot.split("-")[0],
            endTime: update.timeSlot.split("-")[1],
            price: update.price,
            days: [day],
          });
        }
        return newPricing;
      });
      setEditingPrices((prev) => ({
        ...prev,
        [courtId]: { weekdayRanges: [], weekendRanges: [] },
      }));
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

  const [confirmSaveCourtId, setConfirmSaveCourtId] = useState<number | null>(
    null
  );

  // Add new state for managing price ranges
  const [editingCourtId, setEditingCourtId] = useState<number | null>(null);
  const [newPriceRange, setNewPriceRange] = useState<PriceRange>({
    startTime: "06:00",
    endTime: "08:00",
    price: "",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });

  // Function to handle saving price ranges
  const handleSavePriceRanges = async (courtId: number) => {
    try {
      const pricing = editingPrices[courtId];
      if (!pricing) return;

      const rules = [
        ...pricing.weekdayRanges.flatMap((range) =>
          range.days.map((day) => ({
            courtId,
            dayOfWeek: day,
            timeSlot: `${range.startTime}-${range.endTime}`,
            price: range.price,
          }))
        ),
        ...pricing.weekendRanges.flatMap((range) =>
          range.days.map((day) => ({
            courtId,
            dayOfWeek: day,
            timeSlot: `${range.startTime}-${range.endTime}`,
            price: range.price,
          }))
        ),
      ];

      const response = await fetch("/api/pricing-rules/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rules }),
      });

      if (!response.ok) throw new Error("Failed to save pricing rules");

      // Update the court pricing state with the new values
      setCourtPricing((prev) => ({
        ...prev,
        [courtId]: pricing,
      }));

      // Clear editing state
      setEditingPrices((prev) => {
        const newState = { ...prev };
        delete newState[courtId];
        return newState;
      });

      toast({
        title: "Success",
        description: "Pricing rules updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save pricing rules",
        variant: "destructive",
      });
    }
  };

  // Function to add a new price range
  const handleAddPriceRange = (courtId: number, isWeekend: boolean) => {
    setEditingPrices((prev) => ({
      ...prev,
      [courtId]: {
        ...prev[courtId],
        [isWeekend ? "weekendRanges" : "weekdayRanges"]: [
          ...(prev[courtId]?.[isWeekend ? "weekendRanges" : "weekdayRanges"] ||
            []),
          {
            startTime: "06:00",
            endTime: "08:00",
            price: "0.00",
            days: isWeekend ? [6, 0] : [1, 2, 3, 4, 5], // 0=Sunday, 1=Monday, etc.
          },
        ],
      },
    }));
  };

  // Function to remove a price range
  const handleRemovePriceRange = (
    courtId: number,
    isWeekend: boolean,
    index: number
  ) => {
    setEditingPrices((prev) => ({
      ...prev,
      [courtId]: {
        ...prev[courtId],
        [isWeekend ? "weekendRanges" : "weekdayRanges"]: prev[courtId][
          isWeekend ? "weekendRanges" : "weekdayRanges"
        ].filter((_, i) => i !== index),
      },
    }));
  };

  // Function to update a price range
  const handleUpdatePriceRange = (
    courtId: number,
    isWeekend: boolean,
    index: number,
    field: keyof PriceRange,
    value: string | string[]
  ) => {
    setEditingPrices((prev) => ({
      ...prev,
      [courtId]: {
        ...prev[courtId],
        [isWeekend ? "weekendRanges" : "weekdayRanges"]: prev[courtId][
          isWeekend ? "weekendRanges" : "weekdayRanges"
        ].map((range, i) =>
          i === index
            ? {
                ...range,
                [field]:
                  field === "price"
                    ? parseFloat(value as string).toFixed(2)
                    : value,
              }
            : range
        ),
      },
    }));
  };

  // Replace the existing price grid UI with the new range-based UI
  const renderPriceRanges = (court: Court) => {
    const isEditing = editingPrices[court.id];
    const pricing = isEditing ||
      courtPricing[court.id] || { weekdayRanges: [], weekendRanges: [] };

    return (
      <div className="space-y-4">
        {/* Weekday Pricing */}
        <div className="space-y-2">
          <h4 className="font-medium">Monday - Friday</h4>
          {pricing.weekdayRanges.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={range.startTime}
                onChange={(e) =>
                  handleUpdatePriceRange(
                    court.id,
                    false,
                    index,
                    "startTime",
                    e.target.value
                  )
                }
                disabled={!isEditing}
              />
              <span>to</span>
              <Input
                type="time"
                value={range.endTime}
                onChange={(e) =>
                  handleUpdatePriceRange(
                    court.id,
                    false,
                    index,
                    "endTime",
                    e.target.value
                  )
                }
                disabled={!isEditing}
              />
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-1">€</span>
                <Input
                  type="number"
                  value={range.price}
                  onChange={(e) =>
                    handleUpdatePriceRange(
                      court.id,
                      false,
                      index,
                      "price",
                      e.target.value
                    )
                  }
                  placeholder="Price"
                  disabled={!isEditing}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
              </div>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePriceRange(court.id, false, index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPriceRange(court.id, false)}
            >
              Add Time Range
            </Button>
          )}
        </div>

        {/* Weekend Pricing */}
        <div className="space-y-2">
          <h4 className="font-medium">Saturday - Sunday</h4>
          {pricing.weekendRanges.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={range.startTime}
                onChange={(e) =>
                  handleUpdatePriceRange(
                    court.id,
                    true,
                    index,
                    "startTime",
                    e.target.value
                  )
                }
                disabled={!isEditing}
              />
              <span>to</span>
              <Input
                type="time"
                value={range.endTime}
                onChange={(e) =>
                  handleUpdatePriceRange(
                    court.id,
                    true,
                    index,
                    "endTime",
                    e.target.value
                  )
                }
                disabled={!isEditing}
              />
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-1">€</span>
                <Input
                  type="number"
                  value={range.price}
                  onChange={(e) =>
                    handleUpdatePriceRange(
                      court.id,
                      true,
                      index,
                      "price",
                      e.target.value
                    )
                  }
                  placeholder="Price"
                  disabled={!isEditing}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
              </div>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePriceRange(court.id, true, index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPriceRange(court.id, true)}
            >
              Add Time Range
            </Button>
          )}
        </div>

        {/* Edit/Save Buttons */}
        <div className="flex justify-end gap-2">
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingPrices((prev) => ({
                  ...prev,
                  [court.id]: {
                    weekdayRanges: [...(pricing.weekdayRanges || [])],
                    weekendRanges: [...(pricing.weekendRanges || [])],
                  },
                }));
              }}
            >
              Edit Prices
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPrices((prev) => {
                    const newState = { ...prev };
                    delete newState[court.id];
                    return newState;
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSavePriceRanges(court.id)}
              >
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Update the calendar grid cell rendering
  const renderCalendarCell = (court: Court, day: string, time: string) => {
    const price = getCourtSlotPrice(court.id, day, time);
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
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={saveEditCell}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEditCell();
              if (e.key === "Escape") cancelEditCell();
            }}
          />
        ) : (
          <>
            <span className="font-semibold truncate text-center">€{price}</span>
          </>
        )}
      </div>
    );
  };

  // Add new state for court editing
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isEditCourtDialogOpen, setIsEditCourtDialogOpen] = useState(false);

  // Helper to group and format price ranges for display
  function getFormattedPriceRanges(
    courtId: number,
    openTime: string,
    closeTime: string
  ) {
    const pricing = courtPricing[courtId];
    if (!pricing) return { monFri: [], satSun: [] };

    // Helper to filter and format ranges
    const formatRanges = (ranges: any[], daysLabel: string) => {
      return ranges
        .filter((range) => {
          // Only show ranges within open/close time
          const [start, end] = [
            range.startTime || range.timeSlot?.split("-")[0],
            range.endTime || range.timeSlot?.split("-")[1],
          ];
          return start >= openTime && end <= closeTime;
        })
        .map((range) => {
          const start = range.startTime || range.timeSlot?.split("-")[0];
          const end = range.endTime || range.timeSlot?.split("-")[1];
          return `${start}-${end} ${range.price}eur`;
        });
    };

    // Mon–Fri: weekdayRanges, Sat–Sun: weekendRanges
    const monFri = formatRanges(pricing.weekdayRanges, "Mon–Fri");
    const satSun = formatRanges(pricing.weekendRanges, "Sat–Sun");
    return { monFri, satSun };
  }

  // Update the court sections rendering
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
                          {generatedTimeSlots.map((slot, index) => (
                            <div
                              key={index}
                              className="bg-white p-2 rounded border text-center"
                            >
                              {slot.startTime} - {slot.endTime}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Weekly Pricing (copied from previous version) */}
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
          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
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
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Base Rate</p>
                            <p className="font-bold text-blue-600">
                              €{court.hourlyRate}/hour
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCourt(court);
                                setIsEditCourtDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExpandCourt(court)}
                            >
                              {expandedCourtId === court.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time slots for this court - only show if expanded */}
                    {expandedCourtId === court.id && (
                      <>
                        {/* Header with days - moved inside each court section */}
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

                        {/* Price Ranges Summary (between name and base rate) */}
                        <div className="flex w-full justify-between items-center mt-2 mb-2">
                          <div className="text-2xl font-bold">
                            <span>Mon–fri</span>
                            {getPriceRangeSummary(
                              court.id,
                              court.openTime,
                              court.closeTime
                            ).monFri.map((r, i) => (
                              <span
                                key={i}
                                className="ml-4 text-lg font-normal"
                              >
                                {r.start}-{r.end} {r.price}eur
                              </span>
                            ))}
                          </div>
                          <div className="text-2xl font-bold">
                            <span>Sat–sun:</span>
                            {getPriceRangeSummary(
                              court.id,
                              court.openTime,
                              court.closeTime
                            ).satSun.map((r, i) => (
                              <span
                                key={i}
                                className="ml-4 text-lg font-normal"
                              >
                                {r.start}-{r.end} {r.price}eur
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          {allTimeSlots
                            .filter((time) => {
                              const [hour, minute] = time
                                .split("-")[0]
                                .split(":")
                                .map(Number);
                              const courtOpenTime = court.openTime
                                .split(":")
                                .map(Number);
                              const courtCloseTime = court.closeTime
                                .split(":")
                                .map(Number);

                              // Convert to minutes for easier comparison
                              const slotMinutes = hour * 60 + minute;
                              const openMinutes =
                                courtOpenTime[0] * 60 + courtOpenTime[1];
                              const closeMinutes =
                                courtCloseTime[0] * 60 + courtCloseTime[1];

                              return (
                                slotMinutes >= openMinutes &&
                                slotMinutes < closeMinutes
                              );
                            })
                            .map((time) => (
                              <div
                                key={`${court.id}-${time}`}
                                className="grid grid-cols-8 gap-1"
                              >
                                <div className="text-sm text-gray-600 p-2 flex items-center justify-center bg-gray-50 rounded font-medium">
                                  {time}
                                </div>
                                {daysOfWeek.map((day) =>
                                  renderCalendarCell(court, day, time)
                                )}
                              </div>
                            ))}
                        </div>

                        {/* Save button for price changes */}
                        {Object.keys(editingPrices[court.id] || {}).some(
                          (day) =>
                            Object.keys(editingPrices[court.id][day] || {})
                              .length > 0
                        ) && (
                          <Dialog
                            open={confirmSaveCourtId === court.id}
                            onOpenChange={(open) =>
                              setConfirmSaveCourtId(open ? court.id : null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => setConfirmSaveCourtId(court.id)}
                                variant="primary"
                                className="mt-4"
                              >
                                Save Price Changes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Save</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">
                                Are you sure you want to save these price
                                changes for <b>{court.name}</b>?
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setConfirmSaveCourtId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="primary"
                                  onClick={async () => {
                                    await handleSaveCourtPrices(court.id);
                                    setConfirmSaveCourtId(null);
                                  }}
                                >
                                  Confirm
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </>
                    )}
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

      {/* Edit Court Dialog */}
      <Dialog
        open={isEditCourtDialogOpen}
        onOpenChange={setIsEditCourtDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Court</DialogTitle>
          </DialogHeader>
          {editingCourt && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-court-name">Court Name</Label>
                <Input
                  id="edit-court-name"
                  value={editingCourt.name}
                  onChange={(e) =>
                    setEditingCourt({ ...editingCourt, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-open-time">Open Time</Label>
                  <Select
                    value={editingCourt.openTime}
                    onValueChange={(value) =>
                      setEditingCourt({ ...editingCourt, openTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select open time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`edit-open-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-close-time">Close Time</Label>
                  <Select
                    value={editingCourt.closeTime}
                    onValueChange={(value) =>
                      setEditingCourt({ ...editingCourt, closeTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select close time" />
                    </SelectTrigger>
                    <SelectContent>
                      {closingTimeOptions.map((time) => (
                        <SelectItem key={`edit-close-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditCourtDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    // Add your update court mutation here
                    setIsEditCourtDialogOpen(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
