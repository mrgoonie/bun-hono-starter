import { z } from "zod";

import { getPagination } from "@/api/helper";
import { adminProcedure, createTRPCRouter } from "@/api/trpc";
import { profileType, userRolesType } from "@/api/type";

export const usersRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { page = 1, pageSize = 10 } = input;
      const skip = (page - 1) * pageSize;

      const where = {};

      const [list, totalCount] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          ...profileType,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        list,
        pagination: getPagination(page, totalCount, pageSize),
      };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          ...rest,
        },
      });
      return user;
    }),

  getDetail: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { password, createdAt, updatedAt, ...rest } =
        await ctx.prisma.user.findUniqueOrThrow({
          where: { id: input.id },
          include: { UserRoles: userRolesType },
        });

      const UserRoles = rest.UserRoles.map(({ role, ...x }) => {
        return {
          ...x,
          ...role,
        };
      });
      return { ...rest, UserRoles };
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.delete({
        where: { id: input.id },
      });
      return { success: true, message: "user deleted successfully" };
    }),
});
