import { adminRouter } from "@/api/admin";
import { checkoutRouter } from "@/api/checkout";
import { lmsqueezyRouter } from "@/api/lmsqueezy";
import { metaFileRouter } from "@/api/meta-file";
import { productRouter } from "@/api/product";
import { createTRPCRouter } from "@/api/trpc";
import { profileRouter } from "@/api/user";
import { workspaceRouter } from "@/api/workspace";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  profile: profileRouter,
  metaFile: metaFileRouter,
  workspace: workspaceRouter,
  product: productRouter,
  checkout: checkoutRouter,
  lmsqueezy: lmsqueezyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
