#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const isWindows = process.platform === "win32";
const desktopDir = join(process.cwd(), "apps", "desktop");

function run(command, args, options = {}) {
	execFileSync(command, args, {
		cwd: desktopDir,
		stdio: "inherit",
		...options,
	});
}

function discoverCachedBinary() {
	const cacheDir = process.env.CLOAKBROWSER_CACHE_DIR ?? join(homedir(), ".cloakbrowser");
	if (!existsSync(cacheDir)) {
		return null;
	}

	const executableName = isWindows ? "chrome.exe" : "chrome";
	const entries = execFileSync(isWindows ? "cmd.exe" : "ls", isWindows ? ["/c", "dir", "/b", cacheDir] : [cacheDir], {
		encoding: "utf8",
	})
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.filter((name) => name.startsWith("chromium-"));

	for (const entry of entries.sort().reverse()) {
		const executable = join(cacheDir, entry, executableName);
		if (existsSync(executable)) {
			return executable;
		}
	}

	return null;
}

console.log("ProfileDock CloakBrowser setup");
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log("");

const pnpm = isWindows ? "pnpm.cmd" : "pnpm";

console.log("Installing CloakBrowser dev wrapper + Chromium binary...");
run(pnpm, ["exec", "cloakbrowser", "install"]);

console.log("");
console.log("CloakBrowser diagnostics:");
run(pnpm, ["exec", "cloakbrowser", "info"]);

const binary = discoverCachedBinary();
console.log("");
if (binary) {
	console.log("Detected CloakBrowser executable:");
	console.log(binary);
	console.log("");
	console.log("Next steps:");
	console.log("1. Start ProfileDock: pnpm desktop:dev");
	console.log("2. Open Settings → CloakBrowser");
	console.log('3. Click "Auto-detect" or paste the path above');
} else {
	console.log("Could not auto-detect the CloakBrowser executable path.");
	console.log("Open Settings → CloakBrowser and use Auto-detect after launching the app.");
}

if (isWindows) {
	console.log("");
	console.log("Windows note: install and test CloakBrowser with native PowerShell, not WSL.");
}
