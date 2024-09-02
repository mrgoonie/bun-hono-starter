'use server';

import type { FetchResponse, IFetch } from '@/lib/fetch/fetchClient';
import fetchClient from '@/lib/fetch/fetchClient';

export async function fetchServer<T>({ path, ...rest }: IFetch): Promise<FetchResponse<T>> {
	return fetchClient({
		path,
		...rest,
	});
}
