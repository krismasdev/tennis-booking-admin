import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Sample data - replace with real data from API
const revenueData = [
  { month: "Jan", revenue: 4000, bookings: 240 },
  { month: "Feb", revenue: 3000, bookings: 198 },
  { month: "Mar", revenue: 5000, bookings: 290 },
  { month: "Apr", revenue: 4500, bookings: 260 },
  { month: "May", revenue: 6000, bookings: 320 },
  { month: "Jun", revenue: 5500, bookings: 310 },
  { month: "Jul", revenue: 7000, bookings: 380 },
  { month: "Aug", revenue: 6500, bookings: 350 },
  { month: "Sep", revenue: 5800, bookings: 300 },
  { month: "Oct", revenue: 6200, bookings: 330 },
  { month: "Nov", revenue: 5900, bookings: 320 },
  { month: "Dec", revenue: 7200, bookings: 390 },
];

const dailyBookingsData = [
  { day: "Mon", bookings: 12, cancelled: 2 },
  { day: "Tue", bookings: 19, cancelled: 1 },
  { day: "Wed", bookings: 15, cancelled: 3 },
  { day: "Thu", bookings: 22, cancelled: 1 },
  { day: "Fri", bookings: 28, cancelled: 4 },
  { day: "Sat", bookings: 35, cancelled: 2 },
  { day: "Sun", bookings: 30, cancelled: 3 },
];

const courtUsageData = [
  { name: "Court 1", usage: 85, color: "#3B82F6" },
  { name: "Court 2", usage: 92, color: "#10B981" },
  { name: "Court 3", usage: 78, color: "#F59E0B" },
  { name: "Court 4", usage: 88, color: "#EF4444" },
  { name: "Court 5", usage: 65, color: "#8B5CF6" },
  { name: "Court 6", usage: 95, color: "#06B6D4" },
];

const timeSlotData = [
  { time: "6 AM", bookings: 8 },
  { time: "7 AM", bookings: 15 },
  { time: "8 AM", bookings: 22 },
  { time: "9 AM", bookings: 28 },
  { time: "10 AM", bookings: 25 },
  { time: "11 AM", bookings: 18 },
  { time: "12 PM", bookings: 12 },
  { time: "1 PM", bookings: 14 },
  { time: "2 PM", bookings: 20 },
  { time: "3 PM", bookings: 24 },
  { time: "4 PM", bookings: 26 },
  { time: "5 PM", bookings: 30 },
  { time: "6 PM", bookings: 32 },
  { time: "7 PM", bookings: 28 },
  { time: "8 PM", bookings: 18 },
  { time: "9 PM", bookings: 12 },
];

const userTypeData = [
  { name: "Regular Users", value: 65, color: "#3B82F6" },
  { name: "Premium Members", value: 25, color: "#10B981" },
  { name: "Corporate", value: 10, color: "#F59E0B" },
];

export const RevenueChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value, name) => [name === 'revenue' ? `$${value}` : value, name]} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const BookingsChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyBookingsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="bookings" fill="#10B981" name="Bookings" />
            <Bar dataKey="cancelled" fill="#EF4444" name="Cancelled" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const CourtUsageChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Court Usage Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={courtUsageData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={60} />
            <Tooltip formatter={(value) => [`${value}%`, 'Usage Rate']} />
            <Bar dataKey="usage" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const TimeSlotChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSlotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const UserTypePieChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={userTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {userTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const RevenueVsBookingsChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue vs Bookings Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip formatter={(value, name) => [name === 'revenue' ? `$${value}` : value, name]} />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" name="Revenue ($)" />
            <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#10B981" strokeWidth={3} name="Bookings" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 