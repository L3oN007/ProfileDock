import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tagApi } from "@/lib/tauri/tag";
import type { AppError } from "@/types/app";
import type { CreateTagInput, UpdateTagInput } from "@/types/tag";
import { profileKeys } from "@/features/profiles/api/profile-keys";

export const tagKeys = {
	all: ["tags"] as const,
	list: () => [...tagKeys.all, "list"] as const,
};

export function useTags() {
	return useQuery({
		queryKey: tagKeys.list(),
		queryFn: () => tagApi.list(),
	});
}

export function useCreateTag() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateTagInput) => tagApi.create(input),
		onSuccess: () => {
			toast.success("Tag created");
			queryClient.invalidateQueries({ queryKey: tagKeys.all });
		},
		onError: (error: AppError) => toast.error(error.message),
	});
}

export function useDeleteTag() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: tagApi.delete,
		onSuccess: () => {
			toast.success("Tag deleted");
			queryClient.invalidateQueries({ queryKey: tagKeys.all });
		},
		onError: (error: AppError) => toast.error(error.message),
	});
}

export function useUpdateTag() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateTagInput }) =>
			tagApi.update(id, input),
		onSuccess: () => {
			toast.success("Tag updated");
			queryClient.invalidateQueries({ queryKey: tagKeys.all });
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
		},
		onError: (error: AppError) => toast.error(error.message),
	});
}
