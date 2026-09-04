import { FolderTree } from "lucide-react";
import {
	useCreateGroup,
	useDeleteGroup,
	useGroups,
	useUpdateGroup,
} from "@/features/groups/api/queries";
import { OrganizationResourcePage } from "@/features/shared/components/organization-resource-page";

const groupsConfig = {
	title: "Groups",
	description:
		"Organize profiles into shared groups for filtering and bulk actions.",
	singular: "Group",
	plural: "groups",
	createLabel: "New group",
	searchPlaceholder: "Search groups...",
	emptyTitle: "No groups yet",
	emptyDescription: "Create your first group to organize profiles.",
	Icon: FolderTree,
	profilesFilterKey: "groupId" as const,
};

export function GroupsPage() {
	const groupsQuery = useGroups();
	const createGroup = useCreateGroup();
	const updateGroup = useUpdateGroup();
	const deleteGroup = useDeleteGroup();

	return (
		<OrganizationResourcePage
			config={groupsConfig}
			items={groupsQuery.data ?? []}
			isLoading={groupsQuery.isLoading}
			isFetching={groupsQuery.isFetching}
			onRefresh={() => groupsQuery.refetch()}
			onCreate={(name) => createGroup.mutate({ name })}
			isCreating={createGroup.isPending}
			onRename={(id, name) => updateGroup.mutate({ id, input: { name } })}
			isRenaming={updateGroup.isPending}
			onDelete={(id) => deleteGroup.mutate(id)}
			isDeleting={deleteGroup.isPending}
		/>
	);
}
