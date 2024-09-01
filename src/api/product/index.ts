import { Currency } from "@prisma/client";
import { toInt } from "diginext-utils/dist/object";
import { z } from "zod";

import { getPagination } from "@/api/helper";
import { productTagRouter } from "@/api/product/productTagRouter";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/api/trpc";
import { imagesType, productTagType } from "@/api/type";
import makeSlugByName from "@/lib/utils/string/makeSlugByName";
import { generateId } from "lucia";

// Assuming Product and relevant models are defined similar to your Workspace model
const productSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  variantId: z.any(),
  price: z.number().default(1000),
  currency: z.nativeEnum(Currency).default(Currency.VND),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).optional().default([]),
});

export const productRouter = createTRPCRouter({
  tag: productTagRouter,

  // List Products
  list: publicProcedure
    .input(
      z.object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { page = 1, pageSize = 10 } = input;
      const skip = (page - 1) * pageSize;

      try {
        const where = { isActive: true };
        const [products, totalCount] = await Promise.all([
          ctx.prisma.product.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { id: "desc" },
            include: {
              images: imagesType,
              productTags: productTagType,
              lemonsqueezyVariants: {
                select: {
                  variant_id: true,
                  attributes: true,
                },
              },
            },
          }),
          ctx.prisma.product.count({ where }),
        ]);

        return {
          list: products,
          pagination: getPagination(page, totalCount, pageSize),
        };
      } catch (error) {
        throw new Error(
          `Failed to list workspace products: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Create a new Product
  create: protectedProcedure
    .input(productSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { images, tags, variantId, ...rest } = input;

        const slug = makeSlugByName(`${input.name}`);

        const data = {
          id: generateId(15),
          slug,
          ...rest,
        } as any;

        if (tags.length) {
          const productTags = {
            create: tags.map((tagId) => ({
              tag: {
                connect: { id: tagId },
              },
            })),
          };
          data.productTags = productTags;
        }

        const product = await ctx.prisma.product.create({
          data,
        });

        const variant = await ctx.prisma.lemonsqueezyVariant.update({
          where: { variant_id: toInt(variantId) },
          data: {
            productId: product.id,
          },
        });

        return product;
      } catch (error) {
        throw new Error(
          `Failed to create workspace product: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Update a Product
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        images: z.array(z.any()).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, images, ...data } = input;

      try {
        const res = await Promise.all(
          images?.map(async (x) => {
            return ctx.prisma.metaFile.create({
              data: {
                id: generateId(15),
                ...x,
                userId: ctx.user?.id!, // Assuming the existence of ctx.user
                productImageId: id,
              },
            });
          }),
        );

        const updatedProduct = await ctx.prisma.product.update({
          where: { id },
          data: {
            ...data,
            // images: { connect: { id: imageId } },
          },
        });

        return updatedProduct;
      } catch (error) {
        throw new Error(
          `Failed to update workspace product: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Delete a Product
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.product.update({
          where: { id: input.id },
          data: {
            isActive: false,
          },
        });
      } catch (error) {
        throw new Error(
          `Failed to delete workspace product: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
});
