import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

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
}

export function AdminCalendarView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: timeSlots = [] } = useQuery<TimeSlot[]>({
    queryKey: ["/api/time-slots/range", { 
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd")
    }],
    queryFn: async () => {
      const response = await fetch(
        `/api/time-slots/range?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch time slots");
      return response.json();
    },
  });

  // Generate time slots for the week (7:00 AM to 11:00 PM in 30-minute intervals)
  const timeSlots30Min: string[] = [];
  for (let hour = 7; hour < 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots30Min.push(
        `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      );
    }
  }

  // Generate days of the week
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(weekStart, i));
  }

  const getSlotForCourtAndTime = (courtId: number, date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return timeSlots.find(slot => 
      slot.court.id === courtId && 
      slot.date === dateStr && 
      slot.startTime === time
    );
  };

  const getSlotStatus = (slot?: TimeSlot) => {
    if (!slot) return { status: 'unavailable', className: 'bg-gray-100', text: '' };
    
    if (slot.booking) {
      switch (slot.booking.status) {
        case 'confirmed':
          return { 
            status: 'booked', 
            className: 'bg-red-100 border-red-200 text-red-800', 
            text: slot.booking.user.username 
          };
        case 'pending':
          return { 
            status: 'pending', 
            className: 'bg-yellow-100 border-yellow-200 text-yellow-800', 
            text: 'Pending' 
          };
        default:
          return { 
            status: 'available', 
            className: 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200', 
            text: `$${slot.price}` 
          };
      }
    }
    
    if (slot.isAvailable) {
      return { 
        status: 'available', 
        className: 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200', 
        text: `$${slot.price}` 
      };
    }
    
    return { status: 'unavailable', className: 'bg-gray-100', text: 'N/A' };
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Court Schedule Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd, yyyy")}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header with days */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="font-medium text-sm text-gray-600 p-2">Time</div>
                {weekDays.map(day => (
                  <div key={day.toString()} className="font-medium text-sm text-center p-2">
                    <div>{format(day, "EEE")}</div>
                    <div className="text-xs text-gray-500">{format(day, "MMM dd")}</div>
                  </div>
                ))}
              </div>

              {/* Court sections */}
              {courts.map(court => (
                <div key={court.id} className="mb-6">
                  <div className="bg-gray-50 p-2 rounded-lg mb-2">
                    <h3 className="font-medium text-gray-900">{court.name}</h3>
                    <p className="text-xs text-gray-500">${court.hourlyRate}/hour base rate</p>
                  </div>
                  
                  {/* Time slots for this court */}
                  {timeSlots30Min.map(time => (
                    <div key={`${court.id}-${time}`} className="grid grid-cols-8 gap-1 mb-1">
                      <div className="text-xs text-gray-600 p-1 flex items-center">
                        {time}
                      </div>
                      {weekDays.map(day => {
                        const slot = getSlotForCourtAndTime(court.id, day, time);
                        const { status, className, text } = getSlotStatus(slot);
                        
                        return (
                          <div
                            key={`${court.id}-${day.toString()}-${time}`}
                            className={`min-h-[32px] rounded border text-xs p-1 flex items-center justify-center cursor-pointer transition-colors ${className}`}
                            title={slot ? `${court.name} - ${time} - ${text}` : 'No slot available'}
                          >
                            <span className="truncate text-center">{text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 