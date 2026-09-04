import { useProxies } from "@/features/proxies/api/queries";
import { FilterSelect } from "@/features/shared/filter-select";
import { useTags } from "@/features/tags/api/queries";

interface ProfileListFiltersProps {
	groupId?: string;
	tagId?: string;
	status?: string;
	proxyId?: string;
	sort?: string;
	pageSize: number;
	onGroupChange: (groupId?: string) => void;
	onTagChange: (tagId?: string) => void;
	onStatusChange: (status?: string) => void;
	onProxyChange: (proxyId?: string) => void;
	onSortChange: (sort?: string) => void;
	onPageSizeChange: (pageSize: number) => void;
	groups: { id: string; name: string }[];
}

const ALL = "all";

export function ProfileListFilters({
	groupId,
	tagId,
	status,
	proxyId,
	sort,
	pageSize,
	onGroupChange,
	onTagChange,
	onStatusChange,
	onProxyChange,
	onSortChange,
	onPageSizeChange,
	groups,
}: ProfileListFiltersProps) {
	const tagsQuery = useTags();
	const proxiesQuery = useProxies();

	return (
		<div className="flex flex-wrap items-center gap-2 border-border border-b bg-background px-5 py-2.5">
			<FilterSelect
				value={groupId ?? ALL}
				onValueChange={(value) =>
					onGroupChange(value === ALL ? undefined : value)
				}
				placeholder="All groups"
				options={[
					{ value: ALL, label: "All groups" },
					...groups.map((group) => ({ value: group.id, label: group.name })),
				]}
			/>

			<FilterSelect
				value={tagId ?? ALL}
				onValueChange={(value) =>
					onTagChange(value === ALL ? undefined : value)
				}
				placeholder="All tags"
				options={[
					{ value: ALL, label: "All tags" },
					...(tagsQuery.data ?? []).map((tag) => ({
						value: tag.id,
						label: tag.name,
					})),
				]}
			/>

			<FilterSelect
				value={status ?? ALL}
				onValueChange={(value) =>
					onStatusChange(value === ALL ? undefined : value)
				}
				placeholder="All statuses"
				options={[
					{ value: ALL, label: "All statuses" },
					{ value: "ready", label: "Ready" },
					{ value: "running", label: "Running" },
					{ value: "archived", label: "Archived" },
				]}
			/>

			<FilterSelect
				value={proxyId ?? ALL}
				onValueChange={(value) =>
					onProxyChange(value === ALL ? undefined : value)
				}
				placeholder="All proxies"
				options={[
					{ value: ALL, label: "All proxies" },
					...(proxiesQuery.data ?? []).map((proxy) => ({
						value: proxy.id,
						label: proxy.name,
					})),
				]}
			/>

			<div className="mx-1 hidden h-4 w-px bg-border sm:block" />

			<FilterSelect
				value={sort ?? "created_desc"}
				onValueChange={onSortChange}
				placeholder="Sort"
				options={[
					{ value: "created_desc", label: "Newest" },
					{ value: "name_asc", label: "Name A-Z" },
					{ value: "name_desc", label: "Name Z-A" },
					{ value: "updated_desc", label: "Recently updated" },
					{ value: "last_launch_desc", label: "Last launch" },
				]}
			/>

			<FilterSelect
				value={String(pageSize)}
				onValueChange={(value) => onPageSizeChange(Number(value))}
				placeholder="Page size"
				className="min-w-[108px]"
				options={[
					{ value: "25", label: "25 / page" },
					{ value: "50", label: "50 / page" },
					{ value: "100", label: "100 / page" },
					{ value: "200", label: "200 / page" },
				]}
			/>
		</div>
	);
}
