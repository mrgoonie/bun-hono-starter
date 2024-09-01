import type { User } from "@prisma/client";
import { toBool } from "diginext-utils/dist/object";

import {
  WorkspacePermissionDefault,
  WorkspaceRoleDefault,
} from "@/config/constants";
import { prisma } from "@/lib/db";
import makeSlugByName from "@/lib/utils/string/makeSlugByName";
import { generateId } from "lucia";

interface GenerateWorkspaceByUserProps {
  name: string;
  description?: string;
  isPublic: string;
}

export default async function generateWorkspaceByUser(
  user: User,
  input?: GenerateWorkspaceByUserProps,
) {
  //
  try {
    const name = input?.name || `${user.name}'s Workspace`;
    const description = input?.description || `Amazing ${user.name} Workspace`;
    const isPublic = input?.hasOwnProperty("isPublic")
      ? toBool(input.isPublic)
      : false;

    const [fullControlPer, updatePer, invitePer, viewPer] = await Promise.all([
      prisma.workspacePermission.findUniqueOrThrow({
        where: { name: WorkspacePermissionDefault.FULL_CONTROL },
      }),
      prisma.workspacePermission.findUniqueOrThrow({
        where: { name: WorkspacePermissionDefault.UPDATE },
      }),
      prisma.workspacePermission.findUniqueOrThrow({
        where: { name: WorkspacePermissionDefault.INVITE },
      }),
      prisma.workspacePermission.findUniqueOrThrow({
        where: { name: WorkspacePermissionDefault.VIEW },
      }),
    ]);

    const slug = makeSlugByName(name);

    // Create some default role
    const workspace = await prisma.workspace.create({
      data: {
        id: generateId(15),
        slug,
        name,
        description,
        isPublic,
        creatorId: user.id,
        workspaceRoles: {
          create: [
            { id: generateId(15), name: WorkspaceRoleDefault.ADMIN },
            { id: generateId(15), name: WorkspaceRoleDefault.EDITOR },
            { id: generateId(15), name: WorkspaceRoleDefault.INVITER },
            { id: generateId(15), name: WorkspaceRoleDefault.VIEWER },
          ],
        },
      },
      include: {
        workspaceRoles: true,
      },
    });

    // Create permissions for each role
    const rolePermissions = [
      { role: WorkspaceRoleDefault.ADMIN, permissionId: fullControlPer!.id },
      { role: WorkspaceRoleDefault.EDITOR, permissionId: updatePer!.id },
      { role: WorkspaceRoleDefault.INVITER, permissionId: invitePer!.id },
      { role: WorkspaceRoleDefault.VIEWER, permissionId: viewPer!.id },
    ];

    for (const { role, permissionId } of rolePermissions) {
      const workspaceRole = workspace.workspaceRoles.find(
        (r) => r.name === role,
      );
      if (workspaceRole) {
        await prisma.workspaceRolePermission.create({
          data: {
            id: generateId(15),
            workspaceRole: { connect: { id: workspaceRole.id } },
            workspacePermission: { connect: { id: permissionId } },
          },
        });
      }
    }

    // Add User to the Admin role
    const adminRole = workspace.workspaceRoles.find(
      (role) => role.name === WorkspaceRoleDefault.ADMIN,
    );

    if (adminRole) {
      await prisma.workspaceUserRole.create({
        data: {
          id: generateId(15),
          workspace: { connect: { id: workspace.id } },
          user: { connect: { id: user.id } },
          workspaceRole: { connect: { id: adminRole.id } },
        },
      });
    } else {
      throw new Error("Admin role not found in the created workspace");
    }

    return workspace;
  } catch (error) {
    throw new Error(
      `Auto Generate Workspace By User failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
