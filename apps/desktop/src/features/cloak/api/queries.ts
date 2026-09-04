import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cloakKeys } from "@/features/cloak/api/cloak-keys";
import { cloakApi } from "@/lib/tauri/cloak";
import type { AppError } from "@/types/app";

export function useCloakInstallation() {
	return useQuery({
		queryKey: cloakKeys.installation(),
		queryFn: () => cloakApi.installation(),
	});
}

export function useCloakCapabilities() {
	return useQuery({
		queryKey: cloakKeys.capabilities(),
		queryFn: () => cloakApi.capabilities(),
	});
}

export function useSetCloakExecutable() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cloakApi.setExecutable,
		onSuccess: () => {
			toast.success("CloakBrowser executable updated");
			queryClient.invalidateQueries({ queryKey: cloakKeys.all });
			queryClient.invalidateQueries({ queryKey: ["browser-status"] });
			queryClient.invalidateQueries({ queryKey: ["health-check"] });
		},
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});
}

export function useValidateCloakInstallation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cloakApi.validate,
		onSuccess: (result) => {
			if (result.valid) {
				toast.success(result.message ?? "CloakBrowser installation is valid");
			} else {
				toast.error(result.message ?? "CloakBrowser installation is invalid");
			}
			queryClient.invalidateQueries({ queryKey: cloakKeys.all });
		},
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});
}

export function useDiscoveredCloakInstallations() {
	return useQuery({
		queryKey: cloakKeys.discovered(),
		queryFn: () => cloakApi.discover(),
	});
}

export function useAutoConfigureCloak() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cloakApi.autoConfigure,
		onSuccess: () => {
			toast.success("CloakBrowser configured");
			queryClient.invalidateQueries({ queryKey: cloakKeys.all });
			queryClient.invalidateQueries({ queryKey: ["browser-status"] });
			queryClient.invalidateQueries({ queryKey: ["health-check"] });
		},
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});
}
