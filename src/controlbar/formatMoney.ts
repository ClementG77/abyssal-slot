export const formatMoney = (value: number): string =>
	new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
