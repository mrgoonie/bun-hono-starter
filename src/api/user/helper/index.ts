import type { Bill, Payment, UserBalance } from "@prisma/client";
import type { CashType } from "@prisma/client";
import { TransactionType } from "@prisma/client";

import { AppRoleDefault, TagDefault } from "@/config/constants";
import { prisma } from "@/lib/db";
import { generateId } from "lucia";

export async function processCashTransaction(
  userId: string,
  cashType: CashType,
  amount: number,
): Promise<UserBalance> {
  try {
    const session = await prisma.$transaction(async (_prisma) => {
      // Ensure the user exists to maintain data integrity
      const userExists = await _prisma.user.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        throw new Error(`User with ID ${userId} does not exist.`);
      }

      // Record the transaction
      await _prisma.cashTransaction.create({
        data: {
          id: generateId(15),
          userId,
          cashType,
          amount,
          transactionType: TransactionType.DEPOSIT,
        },
      });

      // Update the cached balance, using atomic operations to ensure consistency
      const updatedBalance = await _prisma.userBalance.upsert({
        where: { userId_cashType: { userId, cashType } },
        update: {
          balance: {
            increment: amount,
          },
        },
        create: {
          userId,
          cashType,
          balance: amount,
        },
      });

      return updatedBalance;
    });

    return session;
  } catch (error) {
    console.error("Failed to process cash transaction:", error);
    throw error; // Rethrow the error to be handled by the caller, if necessary
  }
}

export async function processMembership(params: {
  productId: string;
  bill: Bill;
  payment: Payment;
}) {
  const { productId, bill } = params;
  try {
    const DEFAULT_MONTHLY_DURATION = 30;
    const DEFAULT_ANNUAL_DURATION = 365;
    const DEFAULT_DAY_MIN_MILISECOND = 24 * 60 * 60 * 1000;

    const productTag = await prisma.productTag.findFirst({
      where: {
        tag: {
          name: TagDefault.MEMBERSHIP,
        },
        productId,
      },
      select: {
        product: {
          select: {
            id: true,
            productTags: { select: { tag: { select: { name: true } } } },
          },
        },
      },
    });

    if (!productTag) return null;

    const durationInDays =
      productTag.product.productTags.findIndex(
        (x) => x.tag.name == TagDefault.ANNUAL,
      ) >= 0
        ? DEFAULT_ANNUAL_DURATION
        : DEFAULT_MONTHLY_DURATION;

    const proRole = await prisma.role.findFirstOrThrow({
      where: { name: AppRoleDefault.PRO },
    });
    const userId = bill.userId;
    const roleId = proRole.id;

    // Check if the UserRole already exists
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existingUserRole) {
      // Update existing user role
      return await prisma.userRole.update({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        data: {
          endDate: new Date(
            new Date().getTime() + durationInDays * DEFAULT_DAY_MIN_MILISECOND,
          ),
        },
      });
    } else {
      // Create new user role and trigger the function
      const newUserRole = await prisma.userRole.create({
        data: {
          id: generateId(15),
          name: AppRoleDefault.VIEWER,
          userId,
          roleId,
          startDate: new Date(),
          endDate: new Date(
            new Date().getTime() + durationInDays * DEFAULT_DAY_MIN_MILISECOND,
          ),
        },
      });

      return newUserRole;
    }
  } catch (error) {
    throw new Error(
      `Process Membership failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
