import { useTags } from "@/features/tags/api/queries";
import { useProxies } from "@/features/proxies/api/queries";

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

const selectClassName =
	"h-8 rounded-md border border-[#252a36] bg-[#0f1117] px-2 text-sm";

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
		<div className="flex flex-wrap items-center gap-2 border-[#1e2230] border-b bg-[#12161f] px-4 py-2">
			<select
				className={selectClassName}
				value={groupId ?? ""}
				onChange={(e) => onGroupChange(e.target.value || undefined)}
			>
				<option value="">All groups</option>
				{groups.map((group) => (
					<option key={group.id} value={group.id}>
						{group.name}
					</option>
				))}
			</select>

			<select
				className={selectClassName}
				value={tagId ?? ""}
				onChange={(e) => onTagChange(e.target.value || undefined)}
			>
				<option value="">All tags</option>
				{(tagsQuery.data ?? []).map((tag) => (
					<option key={tag.id} value={tag.id}>
						{tag.name}
					</option>
				))}
			</select>

			<select
				className={selectClassName}
				value={status ?? ""}
				onChange={(e) => onStatusChange(e.target.value || undefined)}
			>
				<option value="">All statuses</option>
				<option value="ready">Ready</option>
				<option value="running">Running</option>
				<option value="archived">Archived</option>
			</select>

			<select
				className={selectClassName}
				value={proxyId ?? ""}
				onChange={(e) => onProxyChange(e.target.value || undefined)}
			>
				<option value="">All proxies</option>
				{(proxiesQuery.data ?? []).map((proxy) => (
					<option key={proxy.id} value={proxy.id}>
						{proxy.name}
					</option>
				))}
			</select>

			<select
				className={selectClassName}
				value={sort ?? "created_desc"}
				onChange={(e) => onSortChange(e.target.value || undefined)}
			>
				<option value="created_desc">Newest</option>
				<option value="name_asc">Name A-Z</option>
				<option value="name_desc">Name Z-A</option>
				<option value="updated_desc">Recently updated</option>
				<option value="last_launch_desc">Last launch</option>
			</select>

			<select
				className={selectClassName}
				value={pageSize}
				onChange={(e) => onPageSizeChange(Number(e.target.value))}
			>
				<option value={25}>25 / page</option>
				<option value={50}>50 / page</option>
				<option value={100}>100 / page</option>
				<option value={200}>200 / page</option>
			</select>
		</div>
	);
}
