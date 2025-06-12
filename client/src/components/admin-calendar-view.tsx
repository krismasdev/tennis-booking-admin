import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Euro,
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";

interface TimeSlot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  isAvailable: boolean;
  court: {
    id: number;
    name: string;
  };
  booking?: {
    id: number;
    user: {
      username: string;
    };
    status: string;
  };
}

interface Court {
  id: number;
  name: string;
  description: string;
  hourlyRate: string;
  isActive: boolean;
}

interface PriceRange {
  time: string;
  price: number;
  isWeekend?: boolean;
}

export function AdminCalendarView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: timeSlots = [] } = useQuery<TimeSlot[]>({
    queryKey: [
      "/api/time-slots/range",
      {
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
      },
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/time-slots/range?startDate=${format(
          weekStart,
          "yyyy-MM-dd"
        )}&endDate=${format(weekEnd, "yyyy-MM-dd")}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch time slots");
      return response.json();
    },
  });

  // Generate time slots for the week (6:00 AM to 23:00 PM in 1-hour intervals)
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 6; hour < 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  };

  const timeSlotsList = generateTimeSlots();

  // Generate days of the week
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(weekStart, i));
  }

  // Generate price ranges based on time and day type
  const getPriceForTimeSlot = (
    court: Court,
    time: string,
    date: Date
  ): PriceRange => {
    const basePrice = parseFloat(court.hourlyRate);
    const hour = parseInt(time.split(":")[0]);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday

    let priceMultiplier = 1;
    let timeLabel = "";

    // Define price ranges based on time slots
    if (hour >= 6 && hour < 11) {
      priceMultiplier = 1;
      timeLabel = "6:00-11:00";
    } else if (hour >= 11 && hour < 16) {
      priceMultiplier = 1.3;
      timeLabel = "11:00-16:00";
    } else if (hour >= 16 && hour < 20) {
      priceMultiplier = 1.5;
      timeLabel = "16:00-20:00";
    } else if (hour >= 20 && hour < 23) {
      priceMultiplier = 1.2;
      timeLabel = "20:00-23:00";
    }

    // Weekend premium
    if (isWeekend) {
      priceMultiplier += 0.2;
    }

    return {
      time: timeLabel,
      price: Math.round(basePrice * priceMultiplier),
      isWeekend,
    };
  };

  const getSlotForCourtAndTime = (
    courtId: number,
    date: Date,
    time: string
  ) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return timeSlots.find(
      (slot) =>
        slot.court.id === courtId &&
        slot.date === dateStr &&
        slot.startTime === time
    );
  };

  const getSlotStatus = (
    slot?: TimeSlot,
    court?: Court,
    date?: Date,
    time?: string
  ) => {
    if (!slot && court && date && time) {
      // Generate pricing for empty slots
      const priceInfo = getPriceForTimeSlot(court, time, date);
      return {
        status: "available",
        className:
          "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer",
        text: `€${priceInfo.price}`,
        price: priceInfo.price,
        isWeekend: priceInfo.isWeekend,
      };
    }

    if (!slot)
      return {
        status: "unavailable",
        className: "bg-gray-100 border-gray-200 text-gray-500",
        text: "N/A",
        price: 0,
      };

    if (slot.booking) {
      switch (slot.booking.status) {
        case "confirmed":
          return {
            status: "booked",
            className: "bg-red-50 border-red-200 text-red-800",
            text: slot.booking.user.username,
            price: parseFloat(slot.price),
          };
        case "pending":
          return {
            status: "pending",
            className: "bg-yellow-50 border-yellow-200 text-yellow-800",
            text: "Pending",
            price: parseFloat(slot.price),
          };
        default:
          return {
            status: "available",
            className:
              "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer",
            text: `€${slot.price}`,
            price: parseFloat(slot.price),
          };
      }
    }

    if (slot.isAvailable) {
      return {
        status: "available",
        className:
          "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer",
        text: `€${slot.price}`,
        price: parseFloat(slot.price),
      };
    }

    return {
      status: "unavailable",
      className: "bg-gray-100 border-gray-200 text-gray-500",
      text: "N/A",
      price: 0,
    };
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek((prev) =>
      direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const handleSlotClick = (
    slot: TimeSlot | null | undefined,
    court: Court,
    date: Date,
    time: string
  ) => {
    if (slot) {
      setSelectedSlot(slot);
    } else {
      // Create a virtual slot for empty time slots
      const priceInfo = getPriceForTimeSlot(court, time, date);
      const virtualSlot: TimeSlot = {
        id: 0,
        date: format(date, "yyyy-MM-dd"),
        startTime: time,
        endTime: `${(parseInt(time.split(":")[0]) + 1)
          .toString()
          .padStart(2, "0")}:00`,
        price: priceInfo.price.toString(),
        isAvailable: true,
        court: court,
      };
      setSelectedSlot(virtualSlot);
    }
    setIsSlotDialogOpen(true);
  };

  const getDayTypeLabel = (date: Date) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1) return "Monday Pricing";
    if (dayOfWeek === 6) return "Saturday Pricing";
    if (dayOfWeek >= 2 && dayOfWeek <= 5) return "Monday Pricing (Auto)";
    if (dayOfWeek === 0) return "Saturday Pricing (Auto)";
    return "";
  };

  const isDayBlurred = (date: Date) => {
    const dayOfWeek = date.getDay();
    return (dayOfWeek >= 2 && dayOfWeek <= 5) || dayOfWeek === 0; // Tue-Fri and Sunday
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Courts Calendar - Weekly View
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {format(weekStart, "MMM dd")} -{" "}
                {format(weekEnd, "MMM dd, yyyy")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
              <span>Click slots to view pricing details</span>
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
                {weekDays.map((day) => {
                  const isBlurred = isDayBlurred(day);
                  const dayLabel = getDayTypeLabel(day);
                  return (
                    <div
                      key={day.toString()}
                      className={`font-medium text-sm text-center p-3 bg-gray-50 rounded-lg ${
                        isBlurred ? "opacity-60" : ""
                      }`}
                    >
                      <div className="font-semibold">{format(day, "EEE")}</div>
                      <div className="text-xs text-gray-500 mb-1">
                        {format(day, "MMM dd")}
                      </div>
                      {dayLabel && (
                        <div className="text-xs text-blue-600 font-medium">
                          {dayLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      {timeSlotsList.map((time) => (
                        <div
                          key={`${court.id}-${time}`}
                          className="grid grid-cols-8 gap-1"
                        >
                          <div className="text-sm text-gray-600 p-2 flex items-center justify-center bg-gray-50 rounded font-medium">
                            {time}
                          </div>
                          {weekDays.map((day) => {
                            const slot = getSlotForCourtAndTime(
                              court.id,
                              day,
                              time
                            );
                            const {
                              status,
                              className,
                              text,
                              price,
                              isWeekend,
                            } = getSlotStatus(slot, court, day, time);
                            const isBlurred = isDayBlurred(day);

                            return (
                              <div
                                key={`${court.id}-${day.toString()}-${time}`}
                                className={`min-h-[40px] rounded border text-xs p-2 flex flex-col items-center justify-center transition-all duration-200 ${className} ${
                                  isBlurred ? "opacity-50 blur-[0.5px]" : ""
                                }`}
                                title={`${court.name} - ${format(
                                  day,
                                  "EEE MMM dd"
                                )} - ${time} - ${text}`}
                                onClick={() =>
                                  status === "available" &&
                                  handleSlotClick(
                                    slot || null,
                                    court,
                                    day,
                                    time
                                  )
                                }
                              >
                                <span className="font-semibold truncate text-center">
                                  {text}
                                </span>
                                {price && price > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {isWeekend && (
                                      <span className="text-xs text-orange-600">
                                        ★
                                      </span>
                                    )}
                                    <span className="text-xs opacity-75">
                                      €{price}
                                    </span>
                                  </div>
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

      {/* Slot Details Dialog */}
      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Time Slot Details
            </DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Court</p>
                  <p className="font-semibold">{selectedSlot.court.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Date</p>
                  <p className="font-semibold">
                    {format(new Date(selectedSlot.date), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Time</p>
                  <p className="font-semibold">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Price</p>
                  <p className="font-semibold text-green-600">
                    €{selectedSlot.price}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge
                  variant={selectedSlot.booking ? "destructive" : "default"}
                  className="mt-1"
                >
                  {selectedSlot.booking
                    ? `Booked by ${selectedSlot.booking.user?.username}`
                    : "Available"}
                </Badge>
              </div>

              {selectedSlot.booking && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">
                    Booking Information
                  </p>
                  <p className="text-sm text-red-700">
                    Customer: {selectedSlot.booking.user?.username}
                  </p>
                  <p className="text-sm text-red-700">
                    Status: {selectedSlot.booking.status}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsSlotDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {!selectedSlot.booking && (
                  <Button className="flex-1">Edit Pricing</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
