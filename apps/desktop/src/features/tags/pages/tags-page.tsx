import { Tag } from "lucide-react";

import { OrganizationResourcePage } from "@/features/shared/components/organization-resource-page";
import {
	useCreateTag,
	useDeleteTag,
	useTags,
	useUpdateTag,
} from "@/features/tags/api/queries";

const tagsConfig = {
	title: "Tags",
	description: "Label profiles with tags for quick filtering and organization.",
	singular: "Tag",
	plural: "tags",
	createLabel: "New tag",
	searchPlaceholder: "Search tags...",
	emptyTitle: "No tags yet",
	emptyDescription: "Create your first tag to start organizing profiles.",
	Icon: Tag,
	profilesFilterKey: "tagId" as const,
	showTagColor: true,
};

export function TagsPage() {
	const tagsQuery = useTags();
	const createTag = useCreateTag();
	const updateTag = useUpdateTag();
	const deleteTag = useDeleteTag();

	return (
		<OrganizationResourcePage
			config={tagsConfig}
			items={tagsQuery.data ?? []}
			isLoading={tagsQuery.isLoading}
			isFetching={tagsQuery.isFetching}
			onRefresh={() => tagsQuery.refetch()}
			onCreate={(name, color) => createTag.mutate({ name, color })}
			isCreating={createTag.isPending}
			onUpdateColor={(id, color) => updateTag.mutate({ id, input: { color } })}
			isUpdatingColor={updateTag.isPending}
			onDelete={(id) => deleteTag.mutate(id)}
			isDeleting={deleteTag.isPending}
		/>
	);
}
