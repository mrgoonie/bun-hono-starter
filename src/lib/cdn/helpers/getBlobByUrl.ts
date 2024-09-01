import fs from 'fs';

export default async function getBlobByUrl(url: string) {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

		const blob = await response.blob();

		return blob;
	} catch (error) {
		console.error('Error downloading the image:', error);
		throw new Error('Download Image');
	}
}
