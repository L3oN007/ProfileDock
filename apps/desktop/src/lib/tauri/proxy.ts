import type {
	CreateProxyInput,
	ProfileProxyAssignment,
	ProxyAssignment,
	ProxyCheckResult,
	Proxy as ProxyRecord,
	TestProxyInput,
	UpdateProxyInput,
} from "@/types/proxy";

import { invokeCommand } from "./client";

export const proxyApi = {
	list() {
		return invokeCommand<ProxyRecord[]>("proxy_list");
	},

	get(id: string) {
		return invokeCommand<ProxyRecord>("proxy_get", { id });
	},

	create(input: CreateProxyInput) {
		return invokeCommand<ProxyRecord>("proxy_create", { input });
	},

	update(id: string, input: UpdateProxyInput) {
		return invokeCommand<ProxyRecord>("proxy_update", { id, input });
	},

	archive(id: string) {
		return invokeCommand<void>("proxy_archive", { id });
	},

	check(id: string) {
		return invokeCommand<ProxyCheckResult>("proxy_check", { id });
	},

	testInput(input: TestProxyInput) {
		return invokeCommand<ProxyCheckResult>("proxy_test_input", { input });
	},

	assign(profileId: string, proxyId: string) {
		return invokeCommand<void>("proxy_assign", { profileId, proxyId });
	},

	unassign(profileId: string) {
		return invokeCommand<void>("proxy_unassign", { profileId });
	},

	getProfileAssignment(profileId: string) {
		return invokeCommand<ProfileProxyAssignment>(
			"proxy_get_profile_assignment",
			{
				profileId,
			},
		);
	},

	listAssignments(proxyId: string) {
		return invokeCommand<ProxyAssignment[]>("proxy_list_assignments", {
			proxyId,
		});
	},

	listChecks(proxyId: string, limit?: number) {
		return invokeCommand<ProxyCheckResult[]>("proxy_list_checks", {
			proxyId,
			limit,
		});
	},
};
