import { listen } from "@tauri-apps/api/event";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cloakKeys } from "@/features/cloak/api/cloak-keys";
import { cloakRuntimeApi } from "@/lib/tauri/cloak-runtime";
import type { AppError } from "@/types/app";
import type { CloakInstallProgress } from "@/types/cloak";

function invalidateRuntimeQueries(queryClient: ReturnType<typeof useQueryClient>) {
	queryClient.invalidateQueries({ queryKey: cloakKeys.all });
	queryClient.invalidateQueries({ queryKey: ["browser-status"] });
	queryClient.invalidateQueries({ queryKey: ["health-check"] });
}

export function useCloakRuntimeStatus() {
	return useQuery({
		queryKey: cloakKeys.runtimeStatus(),
		queryFn: () => cloakRuntimeApi.status(),
	});
}

export function useCloakRuntimeList() {
	return useQuery({
		queryKey: cloakKeys.runtimeList(),
		queryFn: () => cloakRuntimeApi.list(),
	});
}

export function useCloakRuntimeUpdate() {
	return useQuery({
		queryKey: cloakKeys.runtimeUpdate(),
		queryFn: () => cloakRuntimeApi.checkUpdate(),
	});
}

export function useInstallCloakRuntime() {
	const queryClient = useQueryClient();
	const [progress, setProgress] = useState<CloakInstallProgress | null>(null);

	useEffect(() => {
		let unlisten: (() => void) | undefined;

		void listen<CloakInstallProgress>("cloak://install-progress", (event) => {
			setProgress(event.payload);
		}).then((cleanup) => {
			unlisten = cleanup;
		});

		return () => {
			unlisten?.();
		};
	}, []);

	return {
		progress,
		...useMutation({
			mutationFn: (version?: string) => cloakRuntimeApi.install(version),
			onMutate: () => {
				setProgress(null);
			},
			onSuccess: (runtime) => {
				toast.success(`CloakBrowser ${runtime.version} installed`);
				invalidateRuntimeQueries(queryClient);
			},
			onError: (error: AppError) => {
				toast.error(error.message);
				invalidateRuntimeQueries(queryClient);
			},
		}),
	};
}

export function useActivateCloakRuntime() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cloakRuntimeApi.activate,
		onSuccess: (runtime) => {
			toast.success(`Activated CloakBrowser ${runtime.version}`);
			invalidateRuntimeQueries(queryClient);
		},
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});
}

export function useRemoveCloakRuntime() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cloakRuntimeApi.remove,
		onSuccess: () => {
			toast.success("CloakBrowser runtime removed");
			invalidateRuntimeQueries(queryClient);
		},
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});
}

export function useCancelCloakRuntimeInstall() {
	return useMutation({
		mutationFn: cloakRuntimeApi.cancelInstall,
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});
}
