import { isNull, toBool, toFloat, toInt } from 'diginext-utils/dist/object';

export enum ConvertType {
	STRING = 'string',
	INT = 'int',
	FLOAT = 'float',
	BOOLEAN = 'boolean',
	ARRAY = 'array',
}

interface GetFormValueOptions {
	type?: ConvertType;
	checkNull?: boolean;
	defaultValue?: any;
}

export default function getFormValue(formData: FormData, key: string, options?: GetFormValueOptions) {
	//
	const type = options?.type || ConvertType.STRING;
	const checkNull = options?.hasOwnProperty('checkNull') ? options.checkNull : false;
	const defaultValue = options?.hasOwnProperty('defaultValue') ? options.defaultValue : undefined;

	try {
		let value = (formData.get(key) as string) || '';

		let res = {
			[ConvertType.INT]: toInt(value),
			[ConvertType.FLOAT]: toFloat(value),
			[ConvertType.BOOLEAN]: toBool(value),
			[ConvertType.ARRAY]: `${value}`.split(',').filter((x) => x),
			[ConvertType.STRING]: value,
		}[type];

		if (!res) if (defaultValue) res = defaultValue;

		if (checkNull && isNull(res) && typeof res != 'boolean') throw new Error(`${key} Can't Be Empty`);

		if (typeof res != 'undefined') return res;

		throw new Error('Wrong type');
	} catch (error) {
		throw new Error(`${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
