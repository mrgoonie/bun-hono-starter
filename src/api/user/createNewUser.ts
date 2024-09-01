import { toBool } from "diginext-utils/dist/object";

import { AppRoleDefault } from "@/config/constants";
import generateWorkspaceByUser from "@/api/workspace/generateWorkspaceByUser";
import { prisma } from "@/lib/db";
import { generateId } from "lucia";

interface ICreateNewUserByAccount {
  name: string;
  email?: string;
  image?: string;
  accountId: string;
}
interface ICreateNewUserByPassword {
  name: string;
  email: string;
  password: string;
  validEmail?: boolean;
}

export default async function createNewUser(
  props: ICreateNewUserByAccount | ICreateNewUserByPassword,
) {
  // let urlRedirect = "/profile";

  try {
    let data: any;

    if ("accountId" in props) {
      const { accountId, email, ...rest } = props;
      data = {
        ...rest,
        ...(email ? { email } : {}),
        Accounts: {
          connect: { id: accountId },
        },
        validEmail: toBool(email),
      };
    } else {
      data = { ...props };
    }

    const viewRole = await prisma.role.findFirstOrThrow({
      where: {
        name: AppRoleDefault.VIEWER,
      },
    });

    const newUser = await prisma.user.create({
      data: {
        id: generateId(15),
        ...data,

        UserRoles: {
          create: {
            role: {
              connect: {
                id: viewRole.id,
              },
            },
          },
        },
      },
    });

    const ws = await generateWorkspaceByUser(newUser);

    if (!newUser || !ws) throw new Error("Please Try Again Later");

    return newUser;
  } catch (error) {
    throw new Error(
      `Create New User failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
