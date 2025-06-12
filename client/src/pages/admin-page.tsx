import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminUserManagement } from "@/components/admin-user-management";
import { AdminScheduleManagement } from "@/components/admin-schedule-management";
import { AdminBookingManagement } from "@/components/admin-booking-management";
import { AdminCalendarView } from "@/components/admin-calendar-view";
import { AdminPricingManagement } from "@/components/admin-pricing-management";
import { AdminCourtsManagement } from "@/components/admin-courts-management";
import {
  RevenueChart,
  BookingsChart,
  CourtUsageChart,
  TimeSlotChart,
  UserTypePieChart,
  RevenueVsBookingsChart,
} from "@/components/admin-charts";
import { useQuery } from "@tanstack/react-query";
import {
  Menu,
  Users,
  Calendar,
  BookOpen,
  DollarSign,
  Clock,
  MapPin,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalCourts: number;
  activeBookings: number;
  pendingBookings: number;
  revenue: number;
  occupancyRate: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  blockedUsers: number;
  totalTimeSlots: number;
  bookedTimeSlots: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Users
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.totalUsers ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Courts
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.totalCourts || 6}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Active Bookings
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.activeBookings || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Pending
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.pendingBookings || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        ${stats?.revenue?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Activity className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Occupancy Rate
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.occupancyRate || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Daily Revenue
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        ${stats?.dailyRevenue?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Monthly Revenue
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        ${stats?.monthlyRevenue?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart />
              <BookingsChart />
              <CourtUsageChart />
              <TimeSlotChart />
              <UserTypePieChart />
              <RevenueVsBookingsChart />
            </div>
          </div>
        );
      case "calendar":
        return <AdminCalendarView />;
      // case "courts":
      //   return <AdminCourtsManagement />;
      case "bookings":
        return <AdminBookingManagement />;
      case "users":
        return <AdminUserManagement />;
      case "pricing":
        return <AdminPricingManagement />;
      case "schedules":
        return <AdminScheduleManagement />;
      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Analytics Dashboard
              </h2>
              <p className="text-gray-600 mt-1">
                Detailed insights and reports
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart />
              <BookingsChart />
              <CourtUsageChart />
              <TimeSlotChart />
              <UserTypePieChart />
              <RevenueVsBookingsChart />
            </div>
          </div>
        );
      case "revenue":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Revenue Analytics
              </h2>
              <p className="text-gray-600 mt-1">
                Track revenue trends and performance
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <RevenueChart />
              <RevenueVsBookingsChart />
            </div>
          </div>
        );
      case "booking-analytics":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Booking Analytics
              </h2>
              <p className="text-gray-600 mt-1">
                Analyze booking patterns and trends
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BookingsChart />
              <TimeSlotChart />
              <CourtUsageChart />
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              <p className="text-gray-600 mt-1">
                Configure system settings and preferences
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Settings panel coming soon...</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a tab from the sidebar</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Laterp Admin</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeTab === "dashboard" && "Dashboard"}
                  {activeTab === "calendar" && "Calendar"}
                  {activeTab === "courts" && "Courts"}
                  {activeTab === "bookings" && "Bookings"}
                  {activeTab === "users" && "Users"}
                  {activeTab === "pricing" && "Pricing"}
                  {activeTab === "schedules" && "Courts"}
                  {activeTab === "analytics" && "Analytics"}
                  {activeTab === "revenue" && "Revenue Analytics"}
                  {activeTab === "booking-analytics" && "Booking Analytics"}
                  {activeTab === "settings" && "Settings"}
                </h1>
                <p className="text-gray-600 mt-1">
                  Welcome back, {user?.username}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 lg:p-8">{renderContent()}</div>
      </div>
    </div>
  );
}
