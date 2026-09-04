import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { groupApi } from "@/lib/tauri/group";
import type { AppError } from "@/types/app";
import type { CreateGroupInput, UpdateGroupInput } from "@/types/group";

export const groupKeys = {
	all: ["groups"] as const,
	list: () => [...groupKeys.all, "list"] as const,
};

export function useGroups() {
	return useQuery({
		queryKey: groupKeys.list(),
		queryFn: () => groupApi.list(),
	});
}

export function useCreateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateGroupInput) => groupApi.create(input),
		onSuccess: () => {
			toast.success("Group created");
			queryClient.invalidateQueries({ queryKey: groupKeys.all });
		},
		onError: (error: AppError) => toast.error(error.message),
	});
}

export function useUpdateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateGroupInput }) =>
			groupApi.update(id, input),
		onSuccess: () => {
			toast.success("Group updated");
			queryClient.invalidateQueries({ queryKey: groupKeys.all });
		},
		onError: (error: AppError) => toast.error(error.message),
	});
}

export function useDeleteGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: groupApi.delete,
		onSuccess: () => {
			toast.success("Group deleted");
			queryClient.invalidateQueries({ queryKey: groupKeys.all });
		},
		onError: (error: AppError) => toast.error(error.message),
	});
}
