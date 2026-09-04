import { Button } from "@ProfileDock/ui/components/button";
import { Checkbox } from "@ProfileDock/ui/components/checkbox";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ProfileDock/ui/components/table";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Play, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { notion } from "@/app/design/system";
import { PageShell } from "@/app/layout/page-shell";
import { useGroups } from "@/features/groups/api/queries";
import {
	useArchiveProfile,
	useBulkUpdateProfiles,
	useDuplicateProfile,
	useLaunchProfile,
	useStopProfile,
} from "@/features/profiles/api/mutations";
import { useProfileListPage } from "@/features/profiles/api/queries";
import { BulkActionsBar } from "@/features/profiles/components/bulk-actions-bar";
import { ProfileListFilters } from "@/features/profiles/components/profile-list-filters";
import { ProfileRowActions } from "@/features/profiles/components/profile-row-actions";
import { ProfileStatusBadge } from "@/features/profiles/components/profile-status-badge";
import { ProfilesToolbar } from "@/features/profiles/components/profiles-toolbar";
import { useProfileListKeyboard } from "@/features/profiles/hooks/use-profile-list-keyboard";
import {
	type ProfileColumnId,
	useProfileListPreferences,
} from "@/features/profiles/hooks/use-profile-list-preferences";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { Profile } from "@/types/profile";

const profilesRoute = getRouteApi("/_app/profiles/");

function formatRelativeTime(value: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";

	const diffMs = Date.now() - date.getTime();
	const minutes = Math.floor(diffMs / 60_000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function ProfilesPage() {
	const desktop = isDesktopRuntime();
	const navigate = useNavigate();
	const { groupId: urlGroupId, tagId: urlTagId } = profilesRoute.useSearch();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const { preferences, toggleColumn, setDensity } = useProfileListPreferences();
	const [search, setSearch] = useState("");
	const [groupId, setGroupId] = useState<string | undefined>(urlGroupId);
	const [tagId, setTagId] = useState<string | undefined>(urlTagId);
	const [status, setStatus] = useState<string | undefined>();
	const [proxyId, setProxyId] = useState<string | undefined>();
	const [sort, setSort] = useState<string | undefined>("created_desc");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);

	useProfileListKeyboard(searchInputRef);

	useEffect(() => {
		setGroupId(urlGroupId);
		setTagId(urlTagId);
	}, [urlGroupId, urlTagId]);

	const profilesQuery = useProfileListPage({
		search: search || undefined,
		groupId,
		tagIds: tagId ? [tagId] : undefined,
		status,
		proxyId,
		sort,
		page,
		pageSize,
	});
	const groupsQuery = useGroups();
	const launchProfile = useLaunchProfile();
	const stopProfile = useStopProfile();
	const archiveProfile = useArchiveProfile();
	const bulkUpdate = useBulkUpdateProfiles();
	const duplicateProfile = useDuplicateProfile();

	const profiles = profilesQuery.data?.items ?? [];
	const total = profilesQuery.data?.total ?? 0;

	const selectedProfiles = useMemo(
		() => profiles.filter((p) => selectedIds.includes(p.id)),
		[profiles, selectedIds],
	);

	const canOpen =
		selectedProfiles.length > 0 &&
		selectedProfiles.every((p) => p.state === "ready");
	const canClose =
		selectedProfiles.length > 0 &&
		selectedProfiles.every((p) => p.state === "running");

	const toggleAll = (checked: boolean) => {
		setSelectedIds(checked ? profiles.map((p) => p.id) : []);
	};

	const toggleOne = (id: string, checked: boolean) => {
		setSelectedIds((current) =>
			checked ? [...current, id] : current.filter((item) => item !== id),
		);
	};

	const handleOpen = () => {
		const profile = selectedProfiles[0];
		if (profile) launchProfile.mutate(profile.id);
	};

	const handleClose = () => {
		for (const profile of selectedProfiles) {
			stopProfile.mutate(profile.id);
		}
	};

	const handleArchive = () => {
		for (const profile of selectedProfiles) {
			archiveProfile.mutate(profile.id);
		}
		setSelectedIds([]);
	};

	const handleBulkGroup = (nextGroupId: string | null) => {
		bulkUpdate.mutate({
			profileIds: selectedIds,
			groupId: nextGroupId === "__ungrouped__" ? null : nextGroupId,
		});
	};

	const handleBulkTags = (tags: string[], mode: "add" | "remove") => {
		bulkUpdate.mutate({
			profileIds: selectedIds,
			...(mode === "add" ? { addTags: tags } : { removeTags: tags }),
		});
	};

	const handleBulkProxy = (nextProxyId: string | null) => {
		bulkUpdate.mutate({
			profileIds: selectedIds,
			proxyId: nextProxyId,
		});
	};

	const rowDensityClass =
		preferences.density === "compact" ? "h-10 text-xs" : "h-12 text-sm";
	const visibleColumns = new Set(preferences.columns);
	const tableColumnCount = 2 + visibleColumns.size + 1;

	return (
		<PageShell fullBleed>
			<ProfilesToolbar
				search={search}
				searchInputRef={searchInputRef}
				onSearchChange={(value) => {
					setSearch(value);
					setPage(1);
				}}
				selectedCount={selectedIds.length}
				canOpen={canOpen}
				canClose={canClose}
				onOpen={handleOpen}
				onClose={handleClose}
				onArchive={handleArchive}
				onCreate={() => navigate({ to: "/profiles/new" })}
				isOpening={launchProfile.isPending}
				isClosing={stopProfile.isPending}
				columns={preferences.columns}
				density={preferences.density}
				onToggleColumn={toggleColumn}
				onDensityChange={setDensity}
			/>

			<BulkActionsBar
				selectedCount={selectedIds.length}
				onMoveGroup={handleBulkGroup}
				onAddTags={(tags) => handleBulkTags(tags, "add")}
				onRemoveTags={(tags) => handleBulkTags(tags, "remove")}
				onAssignProxy={handleBulkProxy}
				onArchive={handleArchive}
				isPending={bulkUpdate.isPending}
			/>

			<ProfileListFilters
				groupId={groupId}
				tagId={tagId}
				status={status}
				proxyId={proxyId}
				sort={sort}
				pageSize={pageSize}
				onGroupChange={(value) => {
					setGroupId(value);
					setPage(1);
				}}
				onTagChange={(value) => {
					setTagId(value);
					setPage(1);
				}}
				onStatusChange={(value) => {
					setStatus(value);
					setPage(1);
				}}
				onProxyChange={(value) => {
					setProxyId(value);
					setPage(1);
				}}
				onSortChange={setSort}
				onPageSizeChange={(value) => {
					setPageSize(value);
					setPage(1);
				}}
				groups={groupsQuery.data ?? []}
			/>

			<div className="flex-1 overflow-auto bg-background px-5 py-4">
				{!desktop ? <DesktopOnlyBanner /> : null}

				{profilesQuery.isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<div className={notion.tableWrap}>
						<Table>
							<TableHeader>
								<TableRow
									className={`${notion.tableHead} hover:bg-transparent ${rowDensityClass}`}
								>
									<TableHead className="w-10">
										<Checkbox
											checked={
												profiles.length > 0 &&
												selectedIds.length === profiles.length
											}
											onCheckedChange={(checked) => toggleAll(checked === true)}
										/>
									</TableHead>
									<TableHead className="w-12">No.</TableHead>
									{visibleColumns.has("name") ? (
										<TableHead>Name</TableHead>
									) : null}
									{visibleColumns.has("displayId") ? (
										<TableHead>Profile ID</TableHead>
									) : null}
									{visibleColumns.has("group") ? (
										<TableHead>Group</TableHead>
									) : null}
									{visibleColumns.has("tags") ? (
										<TableHead>Tags</TableHead>
									) : null}
									{visibleColumns.has("proxy") ? (
										<TableHead>Proxy</TableHead>
									) : null}
									{visibleColumns.has("status") ? (
										<TableHead>Status</TableHead>
									) : null}
									{visibleColumns.has("lastLaunch") ? (
										<TableHead>Last opened</TableHead>
									) : null}
									{visibleColumns.has("remark") ? (
										<TableHead>Remark</TableHead>
									) : null}
									{visibleColumns.has("platform") ? (
										<TableHead>Platform</TableHead>
									) : null}
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{profiles.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={tableColumnCount}
											className="h-24 text-center text-muted-foreground"
										>
											No profiles yet. Click &quot;New Profile&quot; to create
											one.
										</TableCell>
									</TableRow>
								) : (
									profiles.map((profile, index) => (
										<ProfileRow
											key={profile.id}
											index={index}
											profile={profile}
											selected={selectedIds.includes(profile.id)}
											visibleColumns={visibleColumns}
											rowDensityClass={rowDensityClass}
											menuOpen={openMenuId === profile.id}
											onToggleMenu={() =>
												setOpenMenuId((current) =>
													current === profile.id ? null : profile.id,
												)
											}
											onSelect={(checked) => toggleOne(profile.id, checked)}
											onLaunch={() => launchProfile.mutate(profile.id)}
											onStop={() => stopProfile.mutate(profile.id)}
											onDuplicate={() =>
												duplicateProfile.mutate({
													id: profile.id,
													name: `${profile.name} (copy)`,
												})
											}
											isLaunching={launchProfile.isPending}
											isStopping={stopProfile.isPending}
										/>
									))
								)}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			<div className="flex items-center justify-between border-border border-t bg-background px-5 py-3 text-muted-foreground text-xs">
				<span>
					Total {total} · Page {page}
				</span>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						className="border-border"
						disabled={page <= 1}
						onClick={() => setPage((current) => Math.max(1, current - 1))}
					>
						Previous
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="border-border"
						disabled={page * pageSize >= total}
						onClick={() => setPage((current) => current + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		</PageShell>
	);
}

function ProfileRow({
	profile,
	index,
	selected,
	visibleColumns,
	rowDensityClass,
	menuOpen,
	onToggleMenu,
	onSelect,
	onLaunch,
	onStop,
	onDuplicate,
	isLaunching,
	isStopping,
}: {
	profile: Profile;
	index: number;
	selected: boolean;
	visibleColumns: Set<ProfileColumnId>;
	rowDensityClass: string;
	menuOpen: boolean;
	onToggleMenu: () => void;
	onSelect: (checked: boolean) => void;
	onLaunch: () => void;
	onStop: () => void;
	onDuplicate: () => void;
	isLaunching: boolean;
	isStopping: boolean;
}) {
	const isRunning = profile.state === "running";

	return (
		<TableRow
			data-state={selected ? "selected" : undefined}
			className={`${notion.tableRow} ${rowDensityClass}`}
		>
			<TableCell>
				<Checkbox
					checked={selected}
					onCheckedChange={(c) => onSelect(c === true)}
				/>
			</TableCell>
			<TableCell className="text-muted-foreground">{index + 1}</TableCell>
			{visibleColumns.has("name") ? (
				<TableCell>
					<Link
						to="/profiles/$profileId"
						params={{ profileId: profile.id }}
						className="font-medium text-foreground hover:text-chart-1"
					>
						{profile.name}
					</Link>
					{profile.display_id && !visibleColumns.has("displayId") ? (
						<div className="text-[10px] text-muted-foreground">
							{profile.display_id}
						</div>
					) : null}
				</TableCell>
			) : null}
			{visibleColumns.has("displayId") ? (
				<TableCell className="text-muted-foreground">
					{profile.display_id ?? "—"}
				</TableCell>
			) : null}
			{visibleColumns.has("group") ? (
				<TableCell className="text-muted-foreground">
					{profile.group_name ?? "—"}
				</TableCell>
			) : null}
			{visibleColumns.has("tags") ? (
				<TableCell className="max-w-[140px] truncate text-muted-foreground">
					{profile.tags.length ? profile.tags.join(", ") : "—"}
				</TableCell>
			) : null}
			{visibleColumns.has("proxy") ? (
				<TableCell className="text-muted-foreground">
					{profile.proxy_name ?? "—"}
				</TableCell>
			) : null}
			{visibleColumns.has("status") ? (
				<TableCell>
					<ProfileStatusBadge state={profile.state} />
				</TableCell>
			) : null}
			{visibleColumns.has("lastLaunch") ? (
				<TableCell className="text-muted-foreground">
					{formatRelativeTime(profile.last_opened_at)}
				</TableCell>
			) : null}
			{visibleColumns.has("remark") ? (
				<TableCell className="max-w-[200px] truncate text-muted-foreground">
					{profile.remark ?? profile.description ?? "—"}
				</TableCell>
			) : null}
			{visibleColumns.has("platform") ? (
				<TableCell className="text-muted-foreground">
					{profile.platform_label ?? "—"}
				</TableCell>
			) : null}
			<TableCell className="text-right">
				<div className="flex items-center justify-end gap-1">
					{isRunning ? (
						<Button
							size="sm"
							variant="outline"
							disabled={isStopping}
							onClick={onStop}
						>
							<Square className="size-3" />
							Stop
						</Button>
					) : (
						<Button
							size="sm"
							className="bg-primary text-primary-foreground hover:bg-primary/90"
							disabled={isLaunching || profile.state === "archived"}
							onClick={onLaunch}
						>
							<Play className="size-3" />
							Open
						</Button>
					)}
					<div className="relative">
						<Button size="icon-sm" variant="ghost" onClick={onToggleMenu}>
							<MoreHorizontal className="size-3.5" />
						</Button>
						{menuOpen ? (
							<div className="absolute top-8 right-0 z-10">
								<ProfileRowActions
									profile={profile}
									onDuplicate={onDuplicate}
								/>
							</div>
						) : null}
					</div>
				</div>
			</TableCell>
		</TableRow>
	);
}
