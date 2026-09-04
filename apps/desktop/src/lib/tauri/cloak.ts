import type {
	CloakCapabilities,
	CloakInstallation,
	CloakValidationResult,
	DiscoveredCloakInstallation,
} from "@/types/cloak";

import { invokeCommand } from "./client";

export const cloakApi = {
	installation() {
		return invokeCommand<CloakInstallation>("cloak_get_installation");
	},

	setExecutable(path: string) {
		return invokeCommand<CloakInstallation>("cloak_set_executable", { path });
	},

	validate() {
		return invokeCommand<CloakValidationResult>("cloak_validate_installation");
	},

	capabilities() {
		return invokeCommand<CloakCapabilities>("cloak_get_capabilities");
	},

	discover() {
		return invokeCommand<DiscoveredCloakInstallation[]>("cloak_discover_installations");
	},

	autoConfigure() {
		return invokeCommand<CloakInstallation>("cloak_auto_configure");
	},
};
