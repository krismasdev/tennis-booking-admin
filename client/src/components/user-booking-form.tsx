import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

interface UserBookingFormProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function UserBookingForm({ selectedDate, onDateChange }: UserBookingFormProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: availableSlots = [], isLoading } = useQuery({
    queryKey: ["/api/time-slots/available", { date: selectedDate }],
    queryFn: async () => {
      const response = await fetch(`/api/time-slots/available?date=${selectedDate}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch available slots");
      return response.json();
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (timeSlotId: number) => {
      const timeSlot = availableSlots.find((slot: any) => slot.id === timeSlotId);
      if (!timeSlot) throw new Error("Time slot not found");

      const response = await apiRequest("POST", "/api/bookings", {
        timeSlotId,
        status: "confirmed",
        totalPrice: timeSlot.price,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed!",
        description: "Your court reservation has been confirmed.",
      });
      setSelectedTimeSlot(null);
      queryClient.invalidateQueries({ queryKey: ["/api/time-slots/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBooking = () => {
    if (selectedTimeSlot) {
      bookingMutation.mutate(selectedTimeSlot);
    }
  };

  const selectedSlot = availableSlots.find((slot: any) => slot.id === selectedTimeSlot);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Book Your Court
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div>
          <Label htmlFor="booking-date">Select Date</Label>
          <Input
            id="booking-date"
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
        </div>

        {/* Time Slots */}
        <div>
          <Label className="text-base font-medium">Available Time Slots</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No available time slots for this date
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {availableSlots.map((slot: any) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedTimeSlot(slot.id)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedTimeSlot === slot.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-gray-200 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {slot.court.name}
                    </span>
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {slot.startTime} - {slot.endTime}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    ${slot.price}/hour
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Booking Summary */}
        {selectedSlot && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Court:</span>
                <span className="font-medium">{selectedSlot.court.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{format(new Date(selectedDate), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">${selectedSlot.price}</span>
              </div>
            </div>
          </div>
        )}

        {/* Book Button */}
        <Button
          onClick={handleBooking}
          disabled={!selectedTimeSlot || bookingMutation.isPending}
          className="w-full"
          size="lg"
        >
          {bookingMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Booking...
            </>
          ) : selectedSlot ? (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Book Court - ${selectedSlot.price}
            </>
          ) : (
            "Select a time slot to book"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
