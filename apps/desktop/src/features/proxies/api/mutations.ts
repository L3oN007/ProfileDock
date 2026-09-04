import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { profileKeys } from "@/features/profiles/api/profile-keys";
import { proxyApi } from "@/lib/tauri/proxy";
import type { AppError } from "@/types/app";
import type {
	CreateProxyInput,
	TestProxyInput,
	UpdateProxyInput,
} from "@/types/proxy";

import { proxyKeys } from "./proxy-keys";

function handleError(error: AppError) {
	toast.error(error.message);
}

export function useCreateProxy() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateProxyInput) => proxyApi.create(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: proxyKeys.all });
			toast.success("Proxy created");
		},
		onError: handleError,
	});
}

export function useUpdateProxy() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateProxyInput }) =>
			proxyApi.update(id, input),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: proxyKeys.all });
			queryClient.invalidateQueries({ queryKey: proxyKeys.detail(id) });
			toast.success("Proxy updated");
		},
		onError: handleError,
	});
}

export function useArchiveProxy() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => proxyApi.archive(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: proxyKeys.all });
			toast.success("Proxy archived");
		},
		onError: handleError,
	});
}

export function useCheckProxy() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => proxyApi.check(id),
		onSuccess: (result, id) => {
			queryClient.invalidateQueries({ queryKey: proxyKeys.all });
			queryClient.invalidateQueries({ queryKey: proxyKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: proxyKeys.checks(id) });
			toast.success(result.success ? "Proxy is healthy" : "Proxy check failed");
		},
		onError: handleError,
	});
}

export function useTestProxyInput() {
	return useMutation({
		mutationFn: (input: TestProxyInput) => proxyApi.testInput(input),
		onSuccess: (result) => {
			toast.success(
				result.success ? "Connection successful" : "Connection failed",
			);
		},
		onError: handleError,
	});
}

export function useAssignProxy() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			profileId,
			proxyId,
		}: {
			profileId: string;
			proxyId: string;
		}) => proxyApi.assign(profileId, proxyId),
		onSuccess: (_, { profileId, proxyId }) => {
			queryClient.invalidateQueries({ queryKey: proxyKeys.all });
			queryClient.invalidateQueries({ queryKey: proxyKeys.detail(proxyId) });
			queryClient.invalidateQueries({
				queryKey: proxyKeys.profileAssignment(profileId),
			});
			queryClient.invalidateQueries({
				queryKey: profileKeys.detail(profileId),
			});
			toast.success("Proxy assigned");
		},
		onError: handleError,
	});
}

export function useUnassignProxy() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (profileId: string) => proxyApi.unassign(profileId),
		onSuccess: (_, profileId) => {
			queryClient.invalidateQueries({ queryKey: proxyKeys.all });
			queryClient.invalidateQueries({
				queryKey: proxyKeys.profileAssignment(profileId),
			});
			queryClient.invalidateQueries({
				queryKey: profileKeys.detail(profileId),
			});
			toast.success("Proxy unassigned");
		},
		onError: handleError,
	});
}
