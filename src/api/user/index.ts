import { createTRPCRouter, protectedProcedure } from "@/api/trpc";
import { profileType } from "@/api/type";
import { prisma } from "@/lib/db";

export const profileRouter = createTRPCRouter({
  getInfo: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.user?.id! },
      ...profileType,
    });

    const UserRoles = user.UserRoles.map(({ role, ...x }) => {
      return {
        ...x,
        ...role,
      };
    });

    return { ...user, UserRoles };
  }),
});
