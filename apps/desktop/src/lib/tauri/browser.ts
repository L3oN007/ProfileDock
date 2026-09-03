import type { BrowserStatus } from "@/types/app";

import { invokeCommand } from "./client";

export function getBrowserStatus() {
	return invokeCommand<BrowserStatus>("get_browser_status");
}

export function setBrowserExecutable(path: string) {
	return invokeCommand<BrowserStatus>("set_browser_executable", { path });
}
