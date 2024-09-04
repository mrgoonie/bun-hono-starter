import { CashType, type User, type UserBalance, type UserRole } from '@prisma/client';

import { AppRoleDefault } from '@/config/constants';
import formatBytes from '@/lib/utils/string/formatBytes';

export default function getStat(data: User & { UserRoles?: UserRole[]; UserBalance?: UserBalance[] }) {
	//
	if (!data) return {};
	try {
		const isAdmin = !!data?.UserRoles?.find((x) => x.name == AppRoleDefault.ADMIN);
		const isProRole = !!data?.UserRoles?.find((x) => x.name == AppRoleDefault.PRO);

		const cash = data?.UserBalance?.find((x) => x.cashType == CashType.CREDITS)?.balance || 0;
		const cashText = formatBytes(cash);

		return {
			isAdmin,
			isProRole,
			cash,
			cashText,
		};
	} catch (error) {
		throw new Error(`getStat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
