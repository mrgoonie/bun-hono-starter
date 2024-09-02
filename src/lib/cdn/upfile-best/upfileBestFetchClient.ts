import fetchClient, { type FetchResponse, type IFetch } from '@/lib/fetch/fetchClient';
import { getApiUpfileBestUrl } from '.';

export default async function upfileBestFetchClient<T>({ path, ...rest }: IFetch): Promise<FetchResponse<T>> {
	'use client';
	try {
		return await fetchClient({
			path: getApiUpfileBestUrl(path),
			...rest,
		});
	} catch (error) {
		throw new Error(`index failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
