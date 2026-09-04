export type OsFamily = "windows" | "macos" | "linux";

export interface OsOption {
	id: OsFamily;
	label: string;
	versions: { value: string; label: string }[];
}

export const OS_OPTIONS: OsOption[] = [
	{
		id: "windows",
		label: "Windows",
		versions: [
			{ value: "11", label: "Windows 11" },
			{ value: "10", label: "Windows 10" },
		],
	},
	{
		id: "macos",
		label: "macOS",
		versions: [
			{ value: "15", label: "macOS 15" },
			{ value: "14", label: "macOS 14" },
			{ value: "13", label: "macOS 13" },
		],
	},
	{
		id: "linux",
		label: "Linux",
		versions: [{ value: "generic", label: "Generic Linux" }],
	},
];

export const DEFAULT_OS_FAMILY: OsFamily = "windows";
export const DEFAULT_OS_VERSION = "11";

const USER_AGENT_TEMPLATES: Record<OsFamily, Record<string, string>> = {
	windows: {
		"11":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		"10":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	},
	macos: {
		"15":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		"14":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		"13":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	},
	linux: {
		generic:
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	},
};

export function getOsLabel(osFamily: OsFamily, osVersion: string): string {
	const option = OS_OPTIONS.find((item) => item.id === osFamily);
	const version = option?.versions.find((item) => item.value === osVersion);
	return version?.label ?? option?.label ?? "Unknown OS";
}

export function buildPlatformLabel(osFamily: OsFamily, osVersion: string): string {
	return getOsLabel(osFamily, osVersion);
}

export function previewUserAgent(osFamily: OsFamily, osVersion: string): string {
	return (
		USER_AGENT_TEMPLATES[osFamily]?.[osVersion] ??
		USER_AGENT_TEMPLATES[DEFAULT_OS_FAMILY][DEFAULT_OS_VERSION]
	);
}

export function parsePlatformLabel(
	platformLabel: string | undefined,
): { osFamily: OsFamily; osVersion: string } {
	if (!platformLabel) {
		return { osFamily: DEFAULT_OS_FAMILY, osVersion: DEFAULT_OS_VERSION };
	}

	for (const option of OS_OPTIONS) {
		const match = option.versions.find((version) => version.label === platformLabel);
		if (match) {
			return { osFamily: option.id, osVersion: match.value };
		}
	}

	return { osFamily: DEFAULT_OS_FAMILY, osVersion: DEFAULT_OS_VERSION };
}
