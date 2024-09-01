import { toInt } from "diginext-utils/dist/object";
import { z } from "zod";

import { getPagination } from "@/api/helper";
import { createTRPCRouter, protectedProcedure } from "@/api/trpc";
import { configureUpfileBest } from "@/lib/cdn/upfile-best";
import upfileBestFetchServer from "@/lib/cdn/upfile-best/upfileBestFetchServer";

const paginationSchema = z.object({
  page: z.any(),
  pageSize: z.any(),
  filters: z.any().optional(),
  sorter: z.any().optional(),
  from: z.any().optional(),
  to: z.any().optional(),
});

export const metaFileRouter = createTRPCRouter({
  list: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { page: _page, pageSize: _pageSize, filters, sorter } = input;
        const page = toInt(_page) || 1;
        const pageSize = toInt(_pageSize) || 1;

        const skip = (page - 1) * pageSize;
        const whereData = {
          userId: ctx.user!.id!,
          approved: true,
        } as any;

        if (filters?.approved || filters?.approved?.[0])
          whereData.approved = true;

        const orderBy = [
          {
            id: "desc",
          },
        ] as any;

        const data = await ctx.prisma.metaFile.findMany({
          orderBy,
          where: whereData,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          skip,
          take: pageSize,
        });

        // Optionally, get the total count of records for pagination purposes
        const totalCount = await ctx.prisma.metaFile.count({
          where: whereData,
        });
        return {
          list: data.map(
            ({
              user,
              createdAt,
              approved,
              productImageId,
              userId,
              ...item
            }) => {
              // delete (user as any).emailOriginal;
              return item;
            },
          ),
          pagination: getPagination(page, totalCount, pageSize),
        };
      } catch (error) {
        console.error(`list error`, error);

        throw new Error("Not found");
      }
    }),

  generateMeta: protectedProcedure
    .input(
      z.object({
        mimetype: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        configureUpfileBest();

        const mimetype = input.mimetype;

        const res = await upfileBestFetchServer({
          path: "/api/v4/upload/meta",
          data: { mimetype },
          contentType: "application/json",
          method: "POST",
        });

        if (!res?.status || res.error) {
          throw new Error(res.messages?.[0]);
        }

        return res?.data;
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(e.message);
        }

        throw new Error("Đã xảy ra lỗi");
      }
    }),

  store: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        mimetype: z.string().optional(),
        url: z.string().optional(),
        blurBase64: z.string().optional(),
        width: z.any().optional(),
        height: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, mimetype, url, blurBase64, width, height } = input;

        const res = await ctx.prisma.metaFile.create({
          data: {
            id,
            mimetype,
            url,
            blurBase64,
            width,
            height,
            user: { connect: { id: ctx.user?.id! } },
          },
        });

        return res;
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(e.message);
        }

        throw new Error("Đã xảy ra lỗi");
      }
    }),
});
