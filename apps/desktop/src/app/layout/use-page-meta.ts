import { useParams, useRouterState } from "@tanstack/react-router";

import { useProfile } from "@/features/profiles/api/queries";

const PAGE_META: Record<string, { title: string; description?: string }> = {
	"/": { title: "Dashboard", description: "System health overview" },
	"/profiles": { title: "Profiles", description: "Manage browser profiles" },
	"/proxies": { title: "Proxies", description: "Proxy management" },
	"/browsers": { title: "Browsers", description: "Browser providers" },
	"/settings": { title: "Settings", description: "Application configuration" },
};

export function usePageMeta() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const params = useParams({ strict: false });
	const profileId =
		pathname.startsWith("/profiles/") && pathname !== "/profiles/"
			? params.profileId
			: undefined;
	const profileQuery = useProfile(profileId ?? "");

	if (profileId) {
		const name = profileQuery.data?.name;
		return {
			title: name ?? "Profile Detail",
			description: name
				? "Profile overview and activity"
				: "Loading profile...",
		};
	}

	return (
		PAGE_META[pathname] ?? {
			title: "ProfileDock",
			description: undefined,
		}
	);
}
