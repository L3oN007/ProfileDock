import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { browserSettingsApi } from "@/lib/tauri/browser-settings";
import { profileApi } from "@/lib/tauri/profile";
import type { AppError } from "@/types/app";
import type { UpdateBrowserSettingsInput } from "@/types/cloak";
import type { BulkProfileUpdateInput, CreateProfileFullInput, CreateProfileInput, UpdateProfileFullInput, UpdateProfileInput } from "@/types/profile";

import { profileKeys } from "./profile-keys";

function handleError(error: AppError) {
	toast.error(error.message);
}

export function useDuplicateProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, name }: { id: string; name?: string }) =>
			profileApi.duplicate(id, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile duplicated");
		},
		onError: handleError,
	});
}

export function useBulkUpdateProfiles() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: profileApi.bulkUpdate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profiles updated");
		},
		onError: handleError,
	});
}

export function useCreateProfileFull() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateProfileFullInput) => profileApi.createFull(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile created");
		},
		onError: handleError,
	});
}

export function useRestoreProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => profileApi.restore(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile restored");
		},
		onError: handleError,
	});
}

export function useDeleteProfilePermanent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => profileApi.deletePermanent(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile deleted permanently");
		},
		onError: handleError,
	});
}

export function useCreateProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateProfileInput) => profileApi.create(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile created");
		},
		onError: handleError,
	});
}

export function useUpdateProfileFull() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateProfileFullInput }) =>
			profileApi.updateFull(id, input),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) });
			toast.success("Profile updated");
		},
		onError: handleError,
	});
}

export function useClearProfileCache(profileId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => profileApi.clearCache(profileId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.storage(profileId) });
			queryClient.invalidateQueries({ queryKey: profileKeys.events(profileId) });
			toast.success("Cache cleared");
		},
		onError: handleError,
	});
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateProfileInput }) =>
			profileApi.update(id, input),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) });
			toast.success("Profile updated");
		},
		onError: handleError,
	});
}

export function useArchiveProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => profileApi.archive(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile archived");
		},
		onError: handleError,
	});
}

export function useLaunchProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => profileApi.launch(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
		},
		onError: handleError,
	});
}

export function useStopProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => profileApi.stop(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Browser stopped");
		},
		onError: handleError,
	});
}

export function useUpdateBrowserSettings(profileId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateBrowserSettingsInput) =>
			browserSettingsApi.update(profileId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: profileKeys.browserSettings(profileId),
			});
			queryClient.invalidateQueries({
				queryKey: profileKeys.detail(profileId),
			});
			toast.success("Browser settings saved");
		},
		onError: handleError,
	});
}
