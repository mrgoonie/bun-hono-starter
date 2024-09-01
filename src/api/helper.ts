export const getPagination = (page: number, totalCount: number, pageSize: number) => {
	// const total = Math.ceil(totalCount / pageSize);
	return {
		current: page,
		total: totalCount,
		pageSize,
	};
};
