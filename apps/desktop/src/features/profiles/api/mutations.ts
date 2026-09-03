import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { profileApi } from "@/lib/tauri/profile";
import type { AppError } from "@/types/app";
import type { CreateProfileInput, UpdateProfileInput } from "@/types/profile";

import { profileKeys } from "./profile-keys";

function handleError(error: AppError) {
	toast.error(error.message);
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
