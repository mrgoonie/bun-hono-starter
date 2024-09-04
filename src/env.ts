import dotenv from 'dotenv';
import { toInt } from 'diginext-utils/dist/object';

dotenv.config();

export const env = {
	PORT: toInt(process.env['PORT']) || 3000,
	NODE_ENV: process.env['NODE_ENV'] || 'development',
	// authentication
	GITHUB_CLIENT_ID: process.env['GITHUB_CLIENT_ID']!,
	GITHUB_CLIENT_SECRET: process.env['GITHUB_CLIENT_SECRET']!,
	GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID']!,
	GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET']!,
	// redis
	REDIS_HOST: process.env['REDIS_HOST'],
	REDIS_PORT: process.env['REDIS_PORT'],
	REDIS_USERNAME: process.env['REDIS_USERNAME'],
	REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
	// Upfile.best
	UPFILE_BEST_URL: process.env['UPFILE_BEST_URL'],
	UPFILE_BEST_API_KEY: process.env['UPFILE_BEST_API_KEY'],
	// OpenRouter
	OPENROUTER_KEY: process.env['OPENROUTER_KEY'],
	// LemonSqueezy
	LEMONSQUEEZY_STORE_ID: process.env['LEMONSQUEEZY_STORE_ID'],
	LEMONSQUEEZY_API_KEY: process.env['LEMONSQUEEZY_API_KEY'],
	LEMONSQUEEZY_SECRET: process.env['LEMONSQUEEZY_SECRET'],
	LEMONSQUEEZY_WEBHOOK_URL: process.env['LEMONSQUEEZY_WEBHOOK_URL'],
	LEMONSQUEEZY_WEBHOOK_SECRET: process.env['LEMONSQUEEZY_WEBHOOK_SECRET'],
	//
	SITE_TITLE: process.env['SITE_TITLE'] || 'My Web App',
	SITE_DESC: process.env['SITE_DESC'] || 'Description goes here.',
	//
	baseUrl: () => {
		const baseUrl = process.env['BASE_URL'];
		if (baseUrl) return baseUrl;

		const host = process.env['HOST'] || 'localhost';
		const port = process.env['PORT'] || 3000;
		const protocol = process.env['PROTOCOL'] || 'http';

		return `${protocol}://${host}:${port}`;
	},
};
