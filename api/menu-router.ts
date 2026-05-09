import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "./middleware";
import { db } from "./queries/connection";
import { menuItems, activityLogs } from "../db/schema";
import { eq } from "drizzle-orm";

export const menuRouter = router({
  // Public: list all active menu items
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.category) {
        return db.select().from(menuItems)
          .where(eq(menuItems.category, input.category))
          .all();
      }
      return db.select().from(menuItems).all();
    }),

  // Public: get single item
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(menuItems).where(eq(menuItems.id, input.id)).get();
    }),

  // Create menu item
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.string().min(1),
      imagePath: z.string().optional(),
      category: z.string().min(1),
      isPopular: z.boolean().default(false),
      isSpicy: z.boolean().default(false),
      isPreorder: z.boolean().default(false),
      dietary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }: any) => {
      const item = db.insert(menuItems).values({
        name: input.name,
        description: input.description || null,
        price: input.price,
        imagePath: input.imagePath || null,
        category: input.category,
        isPopular: input.isPopular,
        isSpicy: input.isSpicy,
        isPreorder: input.isPreorder,
        dietary: input.dietary || null,
      }).returning().get();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "created_menu_item",
        targetType: "menu",
        targetId: item.id,
        targetName: item.name,
        details: `Added menu item: ${item.name} (${item.price})`,
      }).run();

      return { success: true, item };
    }),

  // Update menu item
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      imagePath: z.string().optional(),
      category: z.string().optional(),
      isPopular: z.boolean().optional(),
      isSpicy: z.boolean().optional(),
      isPreorder: z.boolean().optional(),
      dietary: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }: any) => {
      const { id, ...updates } = input;
      const cleanUpdates: any = {};
      if (updates.name !== undefined) cleanUpdates.name = updates.name;
      if (updates.description !== undefined) cleanUpdates.description = updates.description;
      if (updates.price !== undefined) cleanUpdates.price = updates.price;
      if (updates.imagePath !== undefined) cleanUpdates.imagePath = updates.imagePath;
      if (updates.category !== undefined) cleanUpdates.category = updates.category;
      if (updates.isPopular !== undefined) cleanUpdates.isPopular = updates.isPopular;
      if (updates.isSpicy !== undefined) cleanUpdates.isSpicy = updates.isSpicy;
      if (updates.isPreorder !== undefined) cleanUpdates.isPreorder = updates.isPreorder;
      if (updates.dietary !== undefined) cleanUpdates.dietary = updates.dietary;
      if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;

      db.update(menuItems).set(cleanUpdates).where(eq(menuItems.id, id)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "updated_menu_item",
        targetType: "menu",
        targetId: id,
        targetName: updates.name || "Unknown",
        details: `Updated menu item ID: ${id}`,
      }).run();

      return { success: true };
    }),

  // Delete (soft delete - just deactivate)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: any) => {
      db.update(menuItems).set({ isActive: false }).where(eq(menuItems.id, input.id)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "deleted_menu_item",
        targetType: "menu",
        targetId: input.id,
        targetName: "Menu Item",
        details: `Removed menu item ID: ${input.id}`,
      }).run();

      return { success: true };
    }),
});
