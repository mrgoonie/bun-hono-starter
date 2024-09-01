import AppConfig from '@/config/AppConfig';
import { configureUpfileBest } from '@/lib/cdn/upfile-best';
import { type FetchResponse, type IFetch } from '@/lib/fetch/fetchClient';
import { fetchServer } from '@/lib/fetch/fetchServer';

export default async function upfileBestFetchServer<T>({ path, headers, ...rest }: IFetch): Promise<FetchResponse<T>> {
	'use server';

	try {
		configureUpfileBest();

		return await fetchServer({
			path: AppConfig.getApiUpfileBestUrl(path),
			headers: {
				...headers,
				'upfilebest-api-key': process.env.UPFILE_BEST_API_KEY!,
			},
			...rest,
		});
	} catch (error) {
		throw new Error(`index failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
