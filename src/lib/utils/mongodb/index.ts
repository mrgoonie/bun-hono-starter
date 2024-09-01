export function mongoObjectId() {
	const timestamp = ((new Date().getTime() / 1000) | 0).toString(16);
	return (
		timestamp +
		'xxxxxxxxxxxxxxxx'
			.replace(/[x]/g, function () {
				return ((Math.random() * 16) | 0).toString(16);
			})
			.toLowerCase()
	);
}

export function isValidObjectId(id: string): boolean {
	return /^[a-f\d]{24}$/i.test(id);
}
