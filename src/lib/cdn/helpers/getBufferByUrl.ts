import fs from 'fs';

export default async function getBufferByUrl(url: string) {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		return buffer;
	} catch (error) {
		console.error('Error downloading the image:', error);
		throw new Error('Download Image');
	}
}
