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
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Play, Square } from "lucide-react";
import { useMemo, useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import {
	useArchiveProfile,
	useLaunchProfile,
	useStopProfile,
} from "@/features/profiles/api/mutations";
import { useProfiles } from "@/features/profiles/api/queries";
import { CreateProfileDialog } from "@/features/profiles/components/create-profile-dialog";
import { ProfileStatusBadge } from "@/features/profiles/components/profile-status-badge";
import { ProfilesToolbar } from "@/features/profiles/components/profiles-toolbar";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { formatNetworkLocation } from "@/lib/network/ip-api";
import { useNetworkInfo } from "@/lib/query/network";
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
	const [search, setSearch] = useState("");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [createOpen, setCreateOpen] = useState(false);

	const profilesQuery = useProfiles(search || undefined);
	const networkQuery = useNetworkInfo();
	const launchProfile = useLaunchProfile();
	const stopProfile = useStopProfile();
	const archiveProfile = useArchiveProfile();

	const profiles = profilesQuery.data ?? [];

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
				onCreate={() => setCreateOpen(true)}
				isOpening={launchProfile.isPending}
				isClosing={stopProfile.isPending}
			/>

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
									<TableHead>Status</TableHead>
									<TableHead>IP</TableHead>
									<TableHead>Browser</TableHead>
									<TableHead>Last opened</TableHead>
									<TableHead>Remark</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{profiles.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={9}
											className="h-24 text-center text-[#8b93a1]"
										>
											No profiles yet. Click &quot;New Profile&quot; to create one.
										</TableCell>
									</TableRow>
								) : (
									profiles.map((profile, index) => (
										<ProfileRow
											key={profile.id}
											index={index}
											profile={profile}
											networkIp={networkQuery.data?.ip}
											networkLocation={
												networkQuery.data
													? formatNetworkLocation(networkQuery.data)
													: undefined
											}
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

			<div className="border-[#1e2230] border-t bg-[#12161f] px-4 py-2 text-[#8b93a1] text-xs">
				Total {profiles.length}
			</div>

			<CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
		</PageShell>
	);
}

function ProfileRow({
	profile,
	index,
	networkIp,
	networkLocation,
	selected,
	onSelect,
	onLaunch,
	onStop,
	isLaunching,
	isStopping,
}: {
	profile: Profile;
	index: number;
	networkIp?: string;
	networkLocation?: string;
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
				<Checkbox checked={selected} onCheckedChange={(c) => onSelect(c === true)} />
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
				{profile.pid ? (
					<div className="text-[#6f7888] text-[10px]">PID {profile.pid}</div>
				) : null}
			</TableCell>
			<TableCell>
				<ProfileStatusBadge state={profile.state} />
			</TableCell>
			<TableCell>
				<div className="font-mono text-[#dfe3ea] text-xs">{networkIp ?? "—"}</div>
				{networkLocation ? (
					<div className="truncate text-[#6f7888] text-[10px]">{networkLocation}</div>
				) : null}
			</TableCell>
			<TableCell className="capitalize text-[#c5cdd8]">{profile.browser_provider}</TableCell>
			<TableCell className="text-[#8b93a1]">{formatRelativeTime(profile.last_opened_at)}</TableCell>
			<TableCell className="max-w-[200px] truncate text-[#8b93a1]">
				{profile.description ?? "—"}
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
