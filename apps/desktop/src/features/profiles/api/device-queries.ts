import { useQuery } from "@tanstack/react-query";

import { deviceApi } from "@/lib/tauri/device";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

export const deviceKeys = {
	all: ["device"] as const,
	presets: () => [...deviceKeys.all, "presets"] as const,
	settings: (profileId: string) =>
		[...deviceKeys.all, "settings", profileId] as const,
	overview: (profileId: string) =>
		[...deviceKeys.all, "overview", profileId] as const,
};

export function useDevicePresets() {
	const desktop = isDesktopRuntime();
	return useQuery({
		queryKey: deviceKeys.presets(),
		queryFn: () => deviceApi.listPresets(),
		enabled: desktop,
	});
}
