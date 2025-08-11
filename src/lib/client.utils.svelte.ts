import { goto } from '$app/navigation';
import { page } from '$app/state';

export function navigateTo(path: string) {
	const normalized = path.startsWith('/') ? path : '/' + path;
	goto('/' + page.params.organization_slug + normalized);
}
