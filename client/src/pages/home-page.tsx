import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { UserBookingForm } from "@/components/user-booking-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, User, LogOut, Settings } from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: number;
  status: string;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
    court: {
      name: string;
    };
  };
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Laterp</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              {user?.role === "vendor" && (
                <Link href="/vendor">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Vendor Dashboard
                  </Button>
                </Link>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.username}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-emerald-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Book Your Court
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Reserve premium tennis courts with ease
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <Clock className="inline h-5 w-5 mr-2" />
                24/7 Booking
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <Calendar className="inline h-5 w-5 mr-2" />
                Flexible Scheduling
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <UserBookingForm
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          {/* My Bookings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Court Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Court Type:</span>
                    <span className="font-medium">Hard Court</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Surface:</span>
                    <span className="font-medium">Professional</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lighting:</span>
                    <span className="font-medium">LED Available</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Equipment:</span>
                    <span className="font-medium">Rental Available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-gray-500 text-sm">No bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {booking.timeSlot.court.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.timeSlot.date},{" "}
                            {booking.timeSlot.startTime} -{" "}
                            {booking.timeSlot.endTime}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
