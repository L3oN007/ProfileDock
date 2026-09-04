import type {
	CloakInstallProgress,
	CloakRuntime,
	CloakRuntimeStatus,
	CloakRuntimeUpdateInfo,
} from "@/types/cloak";

import { invokeCommand } from "./client";

export const cloakRuntimeApi = {
	status() {
		return invokeCommand<CloakRuntimeStatus>("cloak_runtime_status");
	},

	list() {
		return invokeCommand<CloakRuntime[]>("cloak_runtime_list");
	},

	install(version?: string) {
		return invokeCommand<CloakRuntime>("cloak_runtime_install", { version });
	},

	cancelInstall() {
		return invokeCommand<void>("cloak_runtime_cancel_install");
	},

	validate(runtimeId: string) {
		return invokeCommand<CloakRuntime>("cloak_runtime_validate", {
			runtimeId,
		});
	},

	activate(runtimeId: string) {
		return invokeCommand<CloakRuntime>("cloak_runtime_activate", {
			runtimeId,
		});
	},

	remove(runtimeId: string) {
		return invokeCommand<void>("cloak_runtime_remove", { runtimeId });
	},

	checkUpdate() {
		return invokeCommand<CloakRuntimeUpdateInfo>("cloak_runtime_check_update");
	},

	installProgress() {
		return invokeCommand<CloakInstallProgress>(
			"cloak_runtime_get_install_progress",
		);
	},
};
