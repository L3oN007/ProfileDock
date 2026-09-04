import { open, save } from "@tauri-apps/plugin-dialog";

import { isDesktopRuntime } from "@/lib/tauri/runtime";

export async function pickOpenJsonFile(title: string) {
	if (!isDesktopRuntime()) return null;

	return open({
		title,
		multiple: false,
		directory: false,
		filters: [{ name: "JSON", extensions: ["json"] }],
	});
}

export async function pickSaveJsonFile(title: string, defaultPath?: string) {
	if (!isDesktopRuntime()) return null;

	return save({
		title,
		defaultPath,
		filters: [{ name: "JSON", extensions: ["json"] }],
	});
}
