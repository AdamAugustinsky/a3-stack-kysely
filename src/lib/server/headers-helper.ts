/**
 * Helper to convert Headers to the format expected by Eden/Treaty
 *
 * Only forward auth-related headers. Passing through request "content-type"
 * from remote form submissions can override Eden's JSON headers and cause
 * Elysia's validator to reject the body with 400 Bad Request.
 */
export function headersToRecord(headers: Headers): Record<string, string> {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		const k = key.toLowerCase();
		if (k === 'cookie' || k === 'authorization') {
			record[k] = value;
		}
	});
	return record;
}
