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
import { Link, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Play, Square } from "lucide-react";
import { useMemo, useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import {
	useArchiveProfile,
	useLaunchProfile,
	useStopProfile,
} from "@/features/profiles/api/mutations";
import { useProfileListPage } from "@/features/profiles/api/queries";
import { useGroups } from "@/features/groups/api/queries";
import { ProfileStatusBadge } from "@/features/profiles/components/profile-status-badge";
import { ProfilesToolbar } from "@/features/profiles/components/profiles-toolbar";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { Profile } from "@/types/profile";

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
	const [search, setSearch] = useState("");
	const [groupId, setGroupId] = useState<string | undefined>();
	const [page, setPage] = useState(1);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const profilesQuery = useProfileListPage({
		search: search || undefined,
		groupId,
		page,
		pageSize: 50,
	});
	const groupsQuery = useGroups();
	const launchProfile = useLaunchProfile();
	const stopProfile = useStopProfile();
	const archiveProfile = useArchiveProfile();

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

	return (
		<PageShell fullBleed>
			<ProfilesToolbar
				search={search}
				onSearchChange={setSearch}
				selectedCount={selectedIds.length}
				canOpen={canOpen}
				canClose={canClose}
				onOpen={handleOpen}
				onClose={handleClose}
				onArchive={handleArchive}
				onCreate={() => navigate({ to: "/profiles/new" })}
				isOpening={launchProfile.isPending}
				isClosing={stopProfile.isPending}
			/>

			<div className="flex flex-wrap items-center gap-2 border-[#1e2230] border-b bg-[#12161f] px-4 py-2">
				<select
					className="h-8 rounded-md border border-[#252a36] bg-[#0f1117] px-2 text-sm"
					value={groupId ?? ""}
					onChange={(e) => {
						setGroupId(e.target.value || undefined);
						setPage(1);
					}}
				>
					<option value="">All groups</option>
					{(groupsQuery.data ?? []).map((group) => (
						<option key={group.id} value={group.id}>
							{group.name}
						</option>
					))}
				</select>
			</div>

			<div className="flex-1 overflow-auto bg-[#0f1117] p-4">
				{!desktop ? <DesktopOnlyBanner /> : null}

				{profilesQuery.isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<div className={`overflow-hidden rounded-lg ${panelClassName}`}>
						<Table>
							<TableHeader>
								<TableRow className="border-[#252a36] hover:bg-transparent">
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
									<TableHead>Name</TableHead>
									<TableHead>Group</TableHead>
									<TableHead>Tags</TableHead>
									<TableHead>Proxy</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Last opened</TableHead>
									<TableHead>Remark</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{profiles.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={10}
											className="h-24 text-center text-[#8b93a1]"
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
											onSelect={(checked) => toggleOne(profile.id, checked)}
											onLaunch={() => launchProfile.mutate(profile.id)}
											onStop={() => stopProfile.mutate(profile.id)}
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

			<div className="flex items-center justify-between border-[#1e2230] border-t bg-[#12161f] px-4 py-2 text-[#8b93a1] text-xs">
				<span>
					Total {total} · Page {page}
				</span>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						className="border-[#252a36]"
						disabled={page <= 1}
						onClick={() => setPage((current) => Math.max(1, current - 1))}
					>
						Previous
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="border-[#252a36]"
						disabled={page * 50 >= total}
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
	onSelect,
	onLaunch,
	onStop,
	isLaunching,
	isStopping,
}: {
	profile: Profile;
	index: number;
	selected: boolean;
	onSelect: (checked: boolean) => void;
	onLaunch: () => void;
	onStop: () => void;
	isLaunching: boolean;
	isStopping: boolean;
}) {
	const isRunning = profile.state === "running";

	return (
		<TableRow
			data-state={selected ? "selected" : undefined}
			className="border-[#252a36] hover:bg-[#1a1f2b]"
		>
			<TableCell>
				<Checkbox
					checked={selected}
					onCheckedChange={(c) => onSelect(c === true)}
				/>
			</TableCell>
			<TableCell className="text-[#8b93a1]">{index + 1}</TableCell>
			<TableCell>
				<Link
					to="/profiles/$profileId"
					params={{ profileId: profile.id }}
					className="font-medium text-[#eef1f6] hover:text-sky-400"
				>
					{profile.name}
				</Link>
				{profile.display_id ? (
					<div className="text-[#6f7888] text-[10px]">{profile.display_id}</div>
				) : null}
			</TableCell>
			<TableCell className="text-[#8b93a1]">{profile.group_name ?? "—"}</TableCell>
			<TableCell className="max-w-[140px] truncate text-[#8b93a1]">
				{profile.tags.length ? profile.tags.join(", ") : "—"}
			</TableCell>
			<TableCell className="text-[#8b93a1]">{profile.proxy_name ?? "—"}</TableCell>
			<TableCell>
				<ProfileStatusBadge state={profile.state} />
			</TableCell>
			<TableCell className="text-[#8b93a1]">
				{formatRelativeTime(profile.last_opened_at)}
			</TableCell>
			<TableCell className="max-w-[200px] truncate text-[#8b93a1]">
				{profile.remark ?? profile.description ?? "—"}
			</TableCell>
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
							className="bg-sky-600 hover:bg-sky-500"
							disabled={isLaunching || profile.state === "archived"}
							onClick={onLaunch}
						>
							<Play className="size-3" />
							Open
						</Button>
					)}
					<Button size="icon-sm" variant="ghost">
						<MoreHorizontal className="size-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
