/**
 * Helper to convert Headers to the format expected by Eden/Treaty
 */
export function headersToRecord(headers: Headers): Record<string, string> {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		record[key] = value;
	});
	return record;
}
