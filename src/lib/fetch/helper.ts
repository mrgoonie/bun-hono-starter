declare const window: Window & typeof globalThis;
const FormData =
	typeof globalThis !== 'undefined' && 'FormData' in globalThis ? globalThis.FormData : require('form-data');

export const isFile = (object: any) => {
	if (object && typeof object.type !== 'undefined' && typeof object.size !== 'undefined') {
		return true;
	}
	return false;
};

export const buildFormData = (formData: FormData, data: any, parentKey?: string) => {
	if (data && typeof data === 'object' && !(data instanceof Date)) {
		Object.keys(data).forEach((key) => {
			if (isFile(data[key])) {
				const file = data[key];
				const name = file.name ? file.name?.replace(' ', '-') : '';
				formData.append(key, file, name);
			} else buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
		});
	} else {
		formData.append(parentKey || '', data);
	}
};

export const toFormData = (data: any) => {
	const form = new FormData();

	buildFormData(form, data);

	return form;
};

export const toQueryString = (e: any) => {
	if (!e) return '';

	const str = new URLSearchParams(e).toString();
	return str;
};
