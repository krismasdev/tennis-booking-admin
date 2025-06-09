import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function AdminScheduleManagement() {
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [isAddCourtDialogOpen, setIsAddCourtDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: timeSlots = [], isLoading } = useQuery({
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
      addCourtForm.reset();
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

  const handleAddSlot = (data: TimeSlotFormData) => {
    addSlotMutation.mutate({
      ...data,
      courtId: parseInt(data.courtId.toString()),
    });
  };

  const handleAddCourt = (data: CourtFormData) => {
    addCourtMutation.mutate(data);
  };

  const handleDeleteSlot = (id: number) => {
    if (window.confirm("Are you sure you want to delete this time slot?")) {
      deleteSlotMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Courts Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Courts</CardTitle>
            <Dialog open={isAddCourtDialogOpen} onOpenChange={setIsAddCourtDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Court
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Court</DialogTitle>
                </DialogHeader>
                <form onSubmit={addCourtForm.handleSubmit(handleAddCourt)} className="space-y-4">
                  <div>
                    <Label htmlFor="court-name">Court Name</Label>
                    <Input
                      id="court-name"
                      {...addCourtForm.register("name")}
                      placeholder="Enter court name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="court-description">Description</Label>
                    <Input
                      id="court-description"
                      {...addCourtForm.register("description")}
                      placeholder="Enter court description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="court-rate">Hourly Rate ($)</Label>
                    <Input
                      id="court-rate"
                      type="number"
                      step="0.01"
                      {...addCourtForm.register("hourlyRate")}
                      placeholder="Enter hourly rate"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddCourtDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
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
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court) => (
              <div key={court.id} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{court.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{court.description}</p>
                <p className="text-lg font-bold text-primary mt-2">
                  ${court.hourlyRate}/hour
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Management</CardTitle>
            <Dialog open={isAddSlotDialogOpen} onOpenChange={setIsAddSlotDialogOpen}>
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
                <form onSubmit={addSlotForm.handleSubmit(handleAddSlot)} className="space-y-4">
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
                    <Select onValueChange={(value) => addSlotForm.setValue("courtId", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select court" />
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

                  <div>
                    <Label htmlFor="slot-price">Price ($)</Label>
                    <Input
                      id="slot-price"
                      type="number"
                      step="0.01"
                      {...addSlotForm.register("price")}
                      placeholder="Enter price"
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
                {timeSlots.map((slot: any) => (
                  <TableRow key={slot.id}>
                    <TableCell>{format(new Date(slot.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{slot.startTime} - {slot.endTime}</TableCell>
                    <TableCell>{slot.court.name}</TableCell>
                    <TableCell>${slot.price}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        slot.isAvailable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
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
    </div>
  );
}
