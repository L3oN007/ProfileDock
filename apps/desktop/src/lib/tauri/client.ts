import { invoke } from "@tauri-apps/api/core";

import type { AppError } from "@/types/app";

import { isDesktopRuntime } from "./runtime";

export async function invokeCommand<T>(
	command: string,
	args?: Record<string, unknown>,
): Promise<T> {
	if (!isDesktopRuntime()) {
		throw {
			code: "DESKTOP_ONLY",
			message:
				"This action is only available in the desktop app. Run `pnpm desktop:dev`.",
		} satisfies AppError;
	}

	try {
		return await invoke<T>(command, args);
	} catch (error) {
		if (isAppError(error)) {
			throw error;
		}

		throw {
			code: "UNKNOWN_ERROR",
			message: error instanceof Error ? error.message : "Unknown IPC error",
		} satisfies AppError;
	}
}

function isAppError(error: unknown): error is AppError {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"message" in error &&
		typeof (error as AppError).code === "string" &&
		typeof (error as AppError).message === "string"
	);
}
