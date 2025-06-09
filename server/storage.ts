import { 
  users, 
  courts, 
  timeSlots, 
  bookings,
  type User, 
  type InsertUser,
  type Court,
  type InsertCourt,
  type TimeSlot,
  type InsertTimeSlot,
  type Booking,
  type InsertBooking,
  type TimeSlotWithCourt,
  type BookingWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  blockUser(id: number): Promise<boolean>;
  unblockUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Court management
  getCourt(id: number): Promise<Court | undefined>;
  getAllCourts(): Promise<Court[]>;
  createCourt(court: InsertCourt): Promise<Court>;
  updateCourt(id: number, court: Partial<InsertCourt>): Promise<Court | undefined>;
  deleteCourt(id: number): Promise<boolean>;

  // Time slot management
  getTimeSlot(id: number): Promise<TimeSlot | undefined>;
  getTimeSlotWithCourt(id: number): Promise<TimeSlotWithCourt | undefined>;
  getTimeSlotsByDate(date: string): Promise<TimeSlotWithCourt[]>;
  getTimeSlotsByDateRange(startDate: string, endDate: string): Promise<TimeSlotWithCourt[]>;
  getAvailableTimeSlots(date: string): Promise<TimeSlotWithCourt[]>;
  createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot>;
  updateTimeSlot(id: number, timeSlot: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined>;
  deleteTimeSlot(id: number): Promise<boolean>;

  // Pricing management
  getPricingRules(courtId: number): Promise<any[]>;
  getAllPricingRules(): Promise<any[]>;
  createOrUpdatePricingRule(courtId: number, timeSlot: string, price: string): Promise<any>;

  // Booking management
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingWithDetails(id: number): Promise<BookingWithDetails | undefined>;
  getUserBookings(userId: number): Promise<BookingWithDetails[]>;
  getAllBookings(): Promise<BookingWithDetails[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  cancelBooking(id: number): Promise<boolean>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async blockUser(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isBlocked: true })
      .where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async unblockUser(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isBlocked: false })
      .where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  // Court methods
  async getCourt(id: number): Promise<Court | undefined> {
    const [court] = await db.select().from(courts).where(eq(courts.id, id));
    return court || undefined;
  }

  async getAllCourts(): Promise<Court[]> {
    return await db.select().from(courts).where(eq(courts.isActive, true)).orderBy(asc(courts.name));
  }

  async createCourt(insertCourt: InsertCourt): Promise<Court> {
    const [court] = await db
      .insert(courts)
      .values(insertCourt)
      .returning();
    return court;
  }

  async updateCourt(id: number, updateData: Partial<InsertCourt>): Promise<Court | undefined> {
    const [court] = await db
      .update(courts)
      .set(updateData)
      .where(eq(courts.id, id))
      .returning();
    return court || undefined;
  }

  async deleteCourt(id: number): Promise<boolean> {
    const result = await db.delete(courts).where(eq(courts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Time slot methods
  async getTimeSlot(id: number): Promise<TimeSlot | undefined> {
    const [timeSlot] = await db.select().from(timeSlots).where(eq(timeSlots.id, id));
    return timeSlot || undefined;
  }

  async getTimeSlotWithCourt(id: number): Promise<TimeSlotWithCourt | undefined> {
    const [result] = await db
      .select()
      .from(timeSlots)
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(eq(timeSlots.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.time_slots,
      court: result.courts
    };
  }

  async getTimeSlotsByDate(date: string): Promise<TimeSlotWithCourt[]> {
    const results = await db
      .select()
      .from(timeSlots)
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(eq(timeSlots.date, date))
      .orderBy(asc(timeSlots.startTime), asc(courts.name));

    return results.map(result => ({
      ...result.time_slots,
      court: result.courts
    }));
  }

  async getAvailableTimeSlots(date: string): Promise<TimeSlotWithCourt[]> {
    const results = await db
      .select()
      .from(timeSlots)
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(and(
        eq(timeSlots.date, date),
        eq(timeSlots.isAvailable, true),
        eq(courts.isActive, true)
      ))
      .orderBy(asc(timeSlots.startTime), asc(courts.name));

    return results.map(result => ({
      ...result.time_slots,
      court: result.courts
    }));
  }

  async createTimeSlot(insertTimeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const [timeSlot] = await db
      .insert(timeSlots)
      .values(insertTimeSlot)
      .returning();
    return timeSlot;
  }

  async updateTimeSlot(id: number, updateData: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined> {
    const [timeSlot] = await db
      .update(timeSlots)
      .set(updateData)
      .where(eq(timeSlots.id, id))
      .returning();
    return timeSlot || undefined;
  }

  async deleteTimeSlot(id: number): Promise<boolean> {
    const result = await db.delete(timeSlots).where(eq(timeSlots.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingWithDetails(id: number): Promise<BookingWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(eq(bookings.id, id));

    if (!result) return undefined;

    return {
      ...result.bookings,
      user: result.users,
      timeSlot: {
        ...result.time_slots,
        court: result.courts
      }
    };
  }

  async getUserBookings(userId: number): Promise<BookingWithDetails[]> {
    const results = await db
      .select()
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    return results.map(result => ({
      ...result.bookings,
      user: result.users,
      timeSlot: {
        ...result.time_slots,
        court: result.courts
      }
    }));
  }

  async getAllBookings(): Promise<BookingWithDetails[]> {
    const results = await db
      .select()
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .orderBy(desc(bookings.createdAt));

    return results.map(result => ({
      ...result.bookings,
      user: result.users,
      timeSlot: {
        ...result.time_slots,
        court: result.courts
      }
    }));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    
    // Mark time slot as unavailable
    await db
      .update(timeSlots)
      .set({ isAvailable: false })
      .where(eq(timeSlots.id, insertBooking.timeSlotId));
    
    return booking;
  }

  async updateBooking(id: number, updateData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async cancelBooking(id: number): Promise<boolean> {
    const booking = await this.getBooking(id);
    if (!booking) return false;

    // Update booking status
    const [updatedBooking] = await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id))
      .returning();

    if (updatedBooking) {
      // Make time slot available again
      await db
        .update(timeSlots)
        .set({ isAvailable: true })
        .where(eq(timeSlots.id, booking.timeSlotId));
      return true;
    }

    return false;
  }

  async getTimeSlotsByDateRange(startDate: string, endDate: string): Promise<TimeSlotWithCourt[]> {
    const results = await db
      .select()
      .from(timeSlots)
      .leftJoin(bookings, eq(timeSlots.id, bookings.timeSlotId))
      .leftJoin(users, eq(bookings.userId, users.id))
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(and(
        gte(timeSlots.date, startDate),
        lte(timeSlots.date, endDate)
      ))
      .orderBy(asc(timeSlots.date), asc(timeSlots.startTime), asc(courts.name));

    return results.map(result => ({
      ...result.time_slots,
      court: result.courts,
      booking: result.bookings ? {
        ...result.bookings,
        user: result.users!
      } : undefined
    }));
  }

  async getPricingRules(courtId: number): Promise<any[]> {
    // For now, return empty array as we don't have a pricing rules table yet
    // This would typically query a pricing_rules table
    return [];
  }

  async getAllPricingRules(): Promise<any[]> {
    // For now, return empty array as we don't have a pricing rules table yet
    return [];
  }

  async createOrUpdatePricingRule(courtId: number, timeSlot: string, price: string): Promise<any> {
    // For now, return a mock pricing rule
    // This would typically insert/update a pricing_rules table
    return {
      id: Math.random(),
      courtId,
      timeSlot,
      price,
      isActive: true
    };
  }
}

export const storage = new DatabaseStorage();
