import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profileRole = pgEnum("profile_role", ["buyer", "producer", "admin"]);
export const profileStatus = pgEnum("profile_status", ["active", "suspended"]);
export const localeCode = pgEnum("locale_code", ["tr", "en"]);
export const verificationStatus = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const categoryKind = pgEnum("category_kind", ["food", "craft"]);
export const productStatus = pgEnum("product_status", ["draft", "pending", "approved", "rejected"]);
export const stockMode = pgEnum("stock_mode", ["in_stock", "made_to_order", "unavailable"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: profileRole("role").notNull().default("buyer"),
  status: profileStatus("status").notNull().default("active"),
  displayName: text("display_name").notNull(),
  locale: localeCode("locale").notNull().default("tr"),
  city: text("city"),
  district: text("district"),
  neighborhoodPublic: text("neighborhood_public"),
  ...timestamps,
});

export const producerProfiles = pgTable("producer_profiles", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  storyTr: text("story_tr").notNull().default(""),
  storyEn: text("story_en").notNull().default(""),
  verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
  deliveryRegions: jsonb("delivery_regions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  approximateArea: text("approximate_area"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  ...timestamps,
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  nameTr: text("name_tr").notNull(),
  nameEn: text("name_en").notNull(),
  kind: categoryKind("kind").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  producerId: uuid("producer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  slug: text("slug").notNull(),
  titleTr: text("title_tr").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionTr: text("description_tr").notNull(),
  descriptionEn: text("description_en").notNull(),
  priceMinor: integer("price_minor").notNull(),
  currency: text("currency").notNull().default("TRY"),
  status: productStatus("status").notNull().default("draft"),
  stockMode: stockMode("stock_mode").notNull().default("made_to_order"),
  stockQuantity: integer("stock_quantity"),
  preparationDays: integer("preparation_days").notNull().default(0),
  city: text("city").notNull(),
  district: text("district").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("products_slug_unique").on(table.slug)]);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  altTr: text("alt_tr").notNull(),
  altEn: text("alt_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const favorites = pgTable("favorites", {
  buyerId: uuid("buyer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.buyerId, table.productId] })]);

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  addressLine: text("address_line").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  postalCode: text("postal_code"),
  deliveryInstructions: text("delivery_instructions"),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});
