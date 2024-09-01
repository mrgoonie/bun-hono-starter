import { makeSlug } from 'diginext-utils/dist/Slug';
import { randomStringAndNumberByLength } from 'diginext-utils/dist/string/random';

export default function makeSlugByName(name: string) {
	try {
		return `${makeSlug(name)}-${randomStringAndNumberByLength(8)}`;
	} catch (error) {
		throw new Error(`Make Slug By Name failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
