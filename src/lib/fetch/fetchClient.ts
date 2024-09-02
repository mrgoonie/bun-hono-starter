import { toFormData, toQueryString } from '@/lib/fetch/helper';

export interface FetchResponse<T> {
	status: number;
	data?: T;
	error?: boolean;
	messages?: Array<string>;
	query?: any;
}

export interface IFetch {
	path: string;
	data?: any;
	cache?: string;
	headers?: any;
	method?: string;
	contentType?: 'multipart/form-data' | 'application/json' | 'application/x-www-form-urlencoded';
}

export default async function fetchClient<T>({
	path,
	data,
	cache = 'no-cache',
	headers,
	method = 'POST',
	contentType = 'application/json',
}: IFetch): Promise<FetchResponse<T>> {
	'use client';

	try {
		let body = data;
		headers = {
			'Content-Type': contentType,
			'Cache-Control': cache,
			...headers,
		};

		switch (contentType) {
			case 'application/json':
				{
					body = JSON.stringify(data);
				}
				break;
			case 'application/x-www-form-urlencoded':
				{
					const form = toFormData(data);
					body = toQueryString(form);
				}
				break;
			case 'multipart/form-data': {
				delete headers?.['Content-Type'];
				break;
			}
			default:
				break;
		}

		const result = await fetch(path, {
			method,
			headers,
			body,
		});
		const response = (await result.json()) as any;

		if (response.errors || !response.status) {
			throw new Error(response.messages?.[0] || 'Vui lòng thử lại sau');
		}

		return response;
	} catch (e) {
		return {
			status: 0,
			error: true,
			messages: [`${e instanceof Error ? e.message : 'Vui lòng thử lại sau'}`],
			query: data,
		};
	}
}
