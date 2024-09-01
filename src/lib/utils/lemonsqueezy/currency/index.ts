import { toInt } from 'diginext-utils/dist/object';
import formatNumber from 'diginext-utils/dist/string/formatNumber';

export function formatVnd(value: string | number) {
	//
	try {
		const price = `${value}`.split('.')[0];
		if (!price) throw new Error('Wrong Format');

		return `${formatNumber(toInt(price.slice(0, -2)))} đ`;
	} catch (error) {
		throw new Error(`index failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
