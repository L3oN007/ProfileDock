import { useQuery } from "@tanstack/react-query";

import { getBrowserStatus } from "@/lib/tauri/browser";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import { healthCheck } from "@/lib/tauri/system";

export function useHealthCheck() {
	const desktop = isDesktopRuntime();

	return useQuery({
		queryKey: ["health-check"],
		queryFn: healthCheck,
		enabled: desktop,
		refetchInterval: desktop ? 10_000 : false,
	});
}

export function useBrowserStatus() {
	return useQuery({
		queryKey: ["browser-status"],
		queryFn: getBrowserStatus,
		enabled: isDesktopRuntime(),
	});
}
