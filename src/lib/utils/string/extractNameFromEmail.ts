export default function extractNameFromEmail(email: string): string {
	// Split the email at the "@" symbol and take the first part
	let name = email.split('@')[0] || '';
	//	// Replace dots, underscores, and hyphens with spaces to normalize the name
	name = name.replace(/\.|_|-/g, ' ').trim();
	return name;
}
