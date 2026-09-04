import { useEffect, useState } from "react";

export type ProfileColumnId =
	| "name"
	| "group"
	| "tags"
	| "proxy"
	| "status"
	| "lastLaunch"
	| "remark"
	| "displayId"
	| "platform";

export type ProfileListDensity = "compact" | "comfortable";

export interface ProfileListPreferences {
	columns: ProfileColumnId[];
	density: ProfileListDensity;
}

const STORAGE_KEY = "profiledock.profile-list-preferences";

export const PROFILE_COLUMN_OPTIONS: {
	id: ProfileColumnId;
	label: string;
}[] = [
	{ id: "name", label: "Name" },
	{ id: "displayId", label: "Profile ID" },
	{ id: "group", label: "Group" },
	{ id: "tags", label: "Tags" },
	{ id: "proxy", label: "Proxy" },
	{ id: "status", label: "Status" },
	{ id: "lastLaunch", label: "Last launch" },
	{ id: "remark", label: "Remark" },
	{ id: "platform", label: "Platform" },
];

const DEFAULT_PREFERENCES: ProfileListPreferences = {
	columns: ["name", "group", "tags", "proxy", "status", "lastLaunch", "remark"],
	density: "comfortable",
};

function loadPreferences(): ProfileListPreferences {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_PREFERENCES;
		const parsed = JSON.parse(raw) as ProfileListPreferences;
		if (!Array.isArray(parsed.columns) || parsed.columns.length === 0) {
			return DEFAULT_PREFERENCES;
		}
		return {
			columns: parsed.columns,
			density: parsed.density === "compact" ? "compact" : "comfortable",
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export function useProfileListPreferences() {
	const [preferences, setPreferences] =
		useState<ProfileListPreferences>(loadPreferences);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	}, [preferences]);

	const toggleColumn = (columnId: ProfileColumnId) => {
		setPreferences((current) => {
			const exists = current.columns.includes(columnId);
			if (exists && current.columns.length <= 1) {
				return current;
			}
			return {
				...current,
				columns: exists
					? current.columns.filter((id) => id !== columnId)
					: [...current.columns, columnId],
			};
		});
	};

	const setDensity = (density: ProfileListDensity) => {
		setPreferences((current) => ({ ...current, density }));
	};

	return {
		preferences,
		toggleColumn,
		setDensity,
	};
}
