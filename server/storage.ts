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
  type BookingWithDetails,
  courtPricingRules,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import session from "express-session";
import connectMySQL from "express-mysql-session";
import { pool } from "./db.js";

const MySQLSessionStore = connectMySQL(session);

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
  updateCourt(
    id: number,
    court: Partial<InsertCourt>
  ): Promise<Court | undefined>;
  deleteCourt(id: number): Promise<boolean>;

  // Time slot management
  getTimeSlot(id: number): Promise<TimeSlot | undefined>;
  getTimeSlotWithCourt(id: number): Promise<TimeSlotWithCourt | undefined>;
  getTimeSlotsByDate(date: string): Promise<TimeSlotWithCourt[]>;
  getTimeSlotsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<TimeSlotWithCourt[]>;
  getAvailableTimeSlots(date: string): Promise<TimeSlotWithCourt[]>;
  createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot>;
  updateTimeSlot(
    id: number,
    timeSlot: Partial<InsertTimeSlot>
  ): Promise<TimeSlot | undefined>;
  deleteTimeSlot(id: number): Promise<boolean>;

  // Pricing management
  getPricingRules(courtId: number): Promise<any[]>;
  getAllPricingRules(): Promise<any[]>;
  createOrUpdatePricingRule(
    courtId: number,
    timeSlot: string,
    price: string
  ): Promise<any>;

  // Booking management
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingWithDetails(id: number): Promise<BookingWithDetails | undefined>;
  getUserBookings(userId: number): Promise<BookingWithDetails[]>;
  getAllBookings(): Promise<BookingWithDetails[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(
    id: number,
    booking: Partial<InsertBooking>
  ): Promise<Booking | undefined>;
  cancelBooking(id: number): Promise<boolean>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new MySQLSessionStore(
      {
        expiration: 86400000, // 24 hours
        createDatabaseTable: true,
        schema: {
          tableName: "sessions",
          columnNames: {
            session_id: "session_id",
            expires: "expires",
            data: "data",
          },
        },
      },
      pool
    );
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await db.insert(users).values(insertUser);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, insertUser.email));
    return user;
  }

  async updateUser(
    id: number,
    updateData: Partial<InsertUser>
  ): Promise<User | undefined> {
    await db.update(users).set(updateData).where(eq(users.id, id));
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.length > 0;
  }

  async blockUser(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isBlocked: true })
      .where(eq(users.id, id));
    return result.length > 0;
  }

  async unblockUser(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isBlocked: false })
      .where(eq(users.id, id));
    return result.length > 0;
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
    return await db
      .select()
      .from(courts)
      .where(eq(courts.isActive, true))
      .orderBy(asc(courts.name));
  }

  async createCourt(insertCourt: InsertCourt): Promise<Court> {
    const { pricingRules, ...courtData } = insertCourt;

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Insert the court
      await tx.insert(courts).values(courtData);
      const [court] = await tx
        .select()
        .from(courts)
        .orderBy(desc(courts.id))
        .limit(1);

      // Insert pricing rules if provided
      if (pricingRules && pricingRules.length > 0) {
        await tx.insert(courtPricingRules).values(
          pricingRules.map((rule) => ({
            courtId: court.id,
            dayOfWeek: rule.dayOfWeek,
            timeSlot: rule.timeSlot,
            price: rule.price,
            isActive: true,
          }))
        );
      }

      return court;
    });
  }

  async updateCourt(
    id: number,
    updateData: Partial<InsertCourt>
  ): Promise<Court | undefined> {
    const { pricingRules, ...courtData } = updateData;

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Update the court
      await tx.update(courts).set(courtData).where(eq(courts.id, id));
      const [court] = await tx.select().from(courts).where(eq(courts.id, id));

      // Update pricing rules if provided
      if (pricingRules) {
        // Delete existing rules
        await tx
          .delete(courtPricingRules)
          .where(eq(courtPricingRules.courtId, id));

        // Insert new rules
        if (pricingRules.length > 0) {
          await tx.insert(courtPricingRules).values(
            pricingRules.map((rule) => ({
              courtId: id,
              dayOfWeek: rule.dayOfWeek,
              timeSlot: rule.timeSlot,
              price: rule.price,
              isActive: true,
            }))
          );
        }
      }

      return court || undefined;
    });
  }

  async deleteCourt(id: number): Promise<boolean> {
    const result = await db.delete(courts).where(eq(courts.id, id));
    return result.length > 0;
  }

  // Time slot methods
  async getTimeSlot(id: number): Promise<TimeSlot | undefined> {
    const [timeSlot] = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.id, id));
    return timeSlot || undefined;
  }

  async getTimeSlotWithCourt(
    id: number
  ): Promise<TimeSlotWithCourt | undefined> {
    const [result] = await db
      .select()
      .from(timeSlots)
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(eq(timeSlots.id, id));

    if (!result) return undefined;

    return {
      ...result.time_slots,
      court: result.courts,
    };
  }

  async getTimeSlotsByDate(date: string): Promise<TimeSlotWithCourt[]> {
    const results = await db
      .select()
      .from(timeSlots)
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(sql`${timeSlots.date} = ${date}`)
      .orderBy(asc(timeSlots.startTime), asc(courts.name));

    return results.map((result) => ({
      ...result.time_slots,
      court: result.courts,
    }));
  }

  async getAvailableTimeSlots(date: string): Promise<TimeSlotWithCourt[]> {
    const results = await db
      .select()
      .from(timeSlots)
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(
        and(
          sql`${timeSlots.date} = ${date}`,
          eq(timeSlots.isAvailable, true),
          eq(courts.isActive, true)
        )
      )
      .orderBy(asc(timeSlots.startTime), asc(courts.name));

    return results.map((result) => ({
      ...result.time_slots,
      court: result.courts,
    }));
  }

  async createTimeSlot(insertTimeSlot: InsertTimeSlot): Promise<TimeSlot> {
    await db.insert(timeSlots).values(insertTimeSlot);
    const [timeSlot] = await db
      .select()
      .from(timeSlots)
      .orderBy(desc(timeSlots.id))
      .limit(1);
    return timeSlot;
  }

  async updateTimeSlot(
    id: number,
    updateData: Partial<InsertTimeSlot>
  ): Promise<TimeSlot | undefined> {
    await db.update(timeSlots).set(updateData).where(eq(timeSlots.id, id));
    const [timeSlot] = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.id, id));
    return timeSlot || undefined;
  }

  async deleteTimeSlot(id: number): Promise<boolean> {
    const result = await db.delete(timeSlots).where(eq(timeSlots.id, id));
    return result.length > 0;
  }

  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingWithDetails(
    id: number
  ): Promise<BookingWithDetails | undefined> {
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
        court: result.courts,
      },
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

    return results.map((result) => ({
      ...result.bookings,
      user: result.users,
      timeSlot: {
        ...result.time_slots,
        court: result.courts,
      },
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

    return results.map((result) => ({
      ...result.bookings,
      user: result.users,
      timeSlot: {
        ...result.time_slots,
        court: result.courts,
      },
    }));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    await db.insert(bookings).values(insertBooking);
    const [booking] = await db
      .select()
      .from(bookings)
      .orderBy(desc(bookings.id))
      .limit(1);

    // Mark time slot as unavailable
    await db
      .update(timeSlots)
      .set({ isAvailable: false })
      .where(eq(timeSlots.id, insertBooking.timeSlotId));

    return booking;
  }

  async updateBooking(
    id: number,
    updateData: Partial<InsertBooking>
  ): Promise<Booking | undefined> {
    await db.update(bookings).set(updateData).where(eq(bookings.id, id));
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    return booking || undefined;
  }

  async cancelBooking(id: number): Promise<boolean> {
    const booking = await this.getBooking(id);
    if (!booking) return false;

    // Update booking status
    await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id));

    // Make time slot available again
    await db
      .update(timeSlots)
      .set({ isAvailable: true })
      .where(eq(timeSlots.id, booking.timeSlotId));
    return true;
  }

  async getTimeSlotsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<TimeSlotWithCourt[]> {
    const results = await db
      .select()
      .from(timeSlots)
      .leftJoin(bookings, eq(timeSlots.id, bookings.timeSlotId))
      .leftJoin(users, eq(bookings.userId, users.id))
      .innerJoin(courts, eq(timeSlots.courtId, courts.id))
      .where(
        and(
          sql`${timeSlots.date} >= ${startDate}`,
          sql`${timeSlots.date} <= ${endDate}`
        )
      )
      .orderBy(asc(timeSlots.date), asc(timeSlots.startTime), asc(courts.name));

    return results.map((result) => ({
      ...result.time_slots,
      court: result.courts,
      booking: result.bookings
        ? {
            ...result.bookings,
            user: result.users!,
          }
        : undefined,
    }));
  }

  async getPricingRules(courtId: number): Promise<any[]> {
    return await this.getCourtPricingRules(courtId);
  }

  async getAllPricingRules(): Promise<any[]> {
    return await db
      .select()
      .from(courtPricingRules)
      .where(eq(courtPricingRules.isActive, true));
  }

  async createOrUpdatePricingRule(
    courtId: number,
    timeSlot: string,
    price: string
  ): Promise<any> {
    const [rule] = await db
      .select()
      .from(courtPricingRules)
      .where(
        eq(courtPricingRules.courtId, courtId) &&
          eq(courtPricingRules.timeSlot, timeSlot)
      );

    if (rule) {
      await db
        .update(courtPricingRules)
        .set({ price })
        .where(eq(courtPricingRules.id, rule.id));
      return rule;
    } else {
      await db.insert(courtPricingRules).values({
        courtId,
        dayOfWeek: 0, // Assuming default dayOfWeek
        timeSlot,
        price,
        isActive: true,
      });
      return true;
    }
  }

  async getCourtPricingRules(courtId: number): Promise<any[]> {
    return await db
      .select()
      .from(courtPricingRules)
      .where(eq(courtPricingRules.courtId, courtId));
  }
}

export const storage = new DatabaseStorage();
