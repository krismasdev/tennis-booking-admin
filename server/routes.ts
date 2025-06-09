import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth } from "./auth.js";
import { insertUserSchema, insertCourtSchema, insertTimeSlotSchema, insertBookingSchema } from "../shared/schema.js";
import { z } from "zod";

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function requireVendor(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || (req.user.role !== "vendor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Vendor access required" });
  }
  next();
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Set up authentication routes
  setupAuth(app);

  // User routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username) || 
                          await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertUserSchema.partial().parse(req.body);
      
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/block", requireVendor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.blockUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User blocked successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/unblock", requireVendor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.unblockUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User unblocked successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Statistics endpoint for dashboard
  app.get("/api/admin/stats", requireVendor, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const courts = await storage.getAllCourts();
      const bookings = await storage.getAllBookings();
      
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      const blockedUsers = users.filter(u => u.isBlocked);
      
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);
      
      // Calculate revenue for different periods (simplified)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dailyRevenue = confirmedBookings
        .filter(b => b.timeSlot.date === todayStr)
        .reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);
      
      const weeklyRevenue = confirmedBookings
        .filter(b => b.timeSlot.date >= weekAgo)
        .reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);
      
      const monthlyRevenue = confirmedBookings
        .filter(b => b.timeSlot.date >= monthAgo)
        .reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);
      
      // Calculate occupancy rate
      const totalTimeSlots = bookings.length;
      const bookedTimeSlots = confirmedBookings.length;
      const occupancyRate = totalTimeSlots > 0 ? Math.round((bookedTimeSlots / totalTimeSlots) * 100) : 0;
      
      res.json({
        totalUsers: users.length,
        totalCourts: courts.length,
        activeBookings: confirmedBookings.length,
        pendingBookings: pendingBookings.length,
        revenue: totalRevenue,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        occupancyRate,
        blockedUsers: blockedUsers.length,
        totalTimeSlots,
        bookedTimeSlots,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Court routes
  app.get("/api/courts", async (req, res) => {
    try {
      const courts = await storage.getAllCourts();
      res.json(courts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/courts", requireAdmin, async (req, res) => {
    try {
      const courtData = insertCourtSchema.parse(req.body);
      const court = await storage.createCourt(courtData);
      res.status(201).json(court);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/courts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertCourtSchema.partial().parse(req.body);
      
      const court = await storage.updateCourt(id, updateData);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      res.json(court);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/courts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCourt(id);
      
      if (!success) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      res.json({ message: "Court deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time slot routes
  app.get("/api/time-slots", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (date) {
        const timeSlots = await storage.getTimeSlotsByDate(date as string);
        res.json(timeSlots);
      } else {
        res.status(400).json({ message: "Date parameter is required" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/time-slots/available", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (date) {
        const timeSlots = await storage.getAvailableTimeSlots(date as string);
        res.json(timeSlots);
      } else {
        res.status(400).json({ message: "Date parameter is required" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/time-slots", requireAdmin, async (req, res) => {
    try {
      const timeSlotData = insertTimeSlotSchema.parse(req.body);
      const timeSlot = await storage.createTimeSlot(timeSlotData);
      res.status(201).json(timeSlot);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/time-slots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertTimeSlotSchema.partial().parse(req.body);
      
      const timeSlot = await storage.updateTimeSlot(id, updateData);
      if (!timeSlot) {
        return res.status(404).json({ message: "Time slot not found" });
      }
      
      res.json(timeSlot);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/time-slots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTimeSlot(id);
      
      if (!success) {
        return res.status(404).json({ message: "Time slot not found" });
      }
      
      res.json({ message: "Time slot deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time slots by date range for calendar view
  app.get("/api/time-slots/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const timeSlots = await storage.getTimeSlotsByDateRange(startDate as string, endDate as string);
      res.json(timeSlots);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pricing rules routes
  app.get("/api/pricing-rules", requireVendor, async (req, res) => {
    try {
      const { courtId } = req.query;
      
      if (courtId) {
        const rules = await storage.getPricingRules(parseInt(courtId as string));
        res.json(rules);
      } else {
        const rules = await storage.getAllPricingRules();
        res.json(rules);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pricing-rules", requireVendor, async (req, res) => {
    try {
      const { courtId, timeSlot, price } = req.body;
      
      if (!courtId || !timeSlot || !price) {
        return res.status(400).json({ message: "Court ID, time slot, and price are required" });
      }
      
      const rule = await storage.createOrUpdatePricingRule(courtId, timeSlot, price);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/pricing-rules/batch", requireVendor, async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      const results = await Promise.all(
        updates.map(({ courtId, timeSlot, price }) => 
          storage.createOrUpdatePricingRule(courtId, timeSlot, price)
        )
      );
      
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Booking routes
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      let bookings;
      
      if (req.user && (req.user.role === "admin" || req.user.role === "vendor")) {
        bookings = await storage.getAllBookings();
      } else {
        bookings = await storage.getUserBookings(req.user!.id);
      }
      
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      // Verify time slot is available
      const timeSlot = await storage.getTimeSlot(bookingData.timeSlotId);
      if (!timeSlot || !timeSlot.isAvailable) {
        return res.status(400).json({ message: "Time slot is not available" });
      }

      const booking = await storage.createBooking(bookingData);
      const bookingWithDetails = await storage.getBookingWithDetails(booking.id);
      
      res.status(201).json(bookingWithDetails);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertBookingSchema.partial().parse(req.body);
      
      // Check if user owns this booking or is admin
      const existingBooking = await storage.getBooking(id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (req.user!.role !== "admin" && req.user!.role !== "vendor" && existingBooking.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to modify this booking" });
      }
      
      const booking = await storage.updateBooking(id, updateData);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const bookingWithDetails = await storage.getBookingWithDetails(booking.id);
      res.json(bookingWithDetails);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user owns this booking or is admin
      const existingBooking = await storage.getBooking(id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (req.user!.role !== "admin" && req.user!.role !== "vendor" && existingBooking.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to cancel this booking" });
      }
      
      const success = await storage.cancelBooking(id);
      
      if (!success) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json({ message: "Booking cancelled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stats endpoint for admin and vendor
  app.get("/api/stats", requireVendor, async (req, res) => {
    try {
      const [users, bookings, courts] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllBookings(),
        storage.getAllCourts()
      ]);

      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const revenue = confirmedBookings.reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);
      
      // Calculate occupancy rate
      const totalSlots = bookings.length;
      const occupancyRate = totalSlots > 0 ? (confirmedBookings.length / totalSlots) * 100 : 0;

      const stats = {
        totalUsers: users.length,
        totalCourts: courts.length,
        activeBookings: confirmedBookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        revenue: revenue,
        occupancyRate: Math.round(occupancyRate),
        dailyRevenue: revenue, // Could be enhanced to calculate actual daily revenue
        blockedUsers: users.filter(u => u.isBlocked).length
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User blocking routes for admin and vendor
  app.post("/api/users/:id/block", requireVendor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.blockUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User blocked successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/unblock", requireVendor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.unblockUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User unblocked successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Calendar view for vendors - get all time slots for a date range
  app.get("/api/calendar", requireVendor, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      // For now, get all bookings and filter by date range
      const bookings = await storage.getAllBookings();
      const filteredBookings = bookings.filter(booking => {
        const bookingDate = booking.timeSlot.date;
        return bookingDate >= startDate && bookingDate <= endDate;
      });

      res.json(filteredBookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
