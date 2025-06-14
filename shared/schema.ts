import {
  mysqlTable,
  text,
  serial,
  int,
  boolean,
  timestamp,
  decimal,
  date,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  birthday: date("birthday"),
  role: text("role").notNull().default("user"), // user, admin, vendor
  isBlocked: boolean("is_blocked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courts = mysqlTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const timeSlots = mysqlTable("time_slots", {
  id: serial("id").primaryKey(),
  courtId: int("court_id")
    .references(() => courts.id)
    .notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // Format: "HH:MM"
  endTime: text("end_time").notNull(), // Format: "HH:MM"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: serial("id").primaryKey(),
  userId: int("user_id")
    .references(() => users.id)
    .notNull(),
  timeSlotId: int("time_slot_id")
    .references(() => timeSlots.id)
    .notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const courtsRelations = relations(courts, ({ many }) => ({
  timeSlots: many(timeSlots),
}));

export const timeSlotsRelations = relations(timeSlots, ({ one, many }) => ({
  court: one(courts, {
    fields: [timeSlots.courtId],
    references: [courts.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  timeSlot: one(timeSlots, {
    fields: [bookings.timeSlotId],
    references: [timeSlots.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["user", "admin", "vendor"]).default("user"),
  });

export const insertCourtSchema = createInsertSchema(courts).omit({
  id: true,
});

export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Court = typeof courts.$inferSelect;
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type TimeSlot = typeof timeSlots.$inferSelect;
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Extended types for API responses
export type TimeSlotWithCourt = TimeSlot & {
  court: Court;
};

export type BookingWithDetails = Booking & {
  user: User;
  timeSlot: TimeSlotWithCourt;
};
