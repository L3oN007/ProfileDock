import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@ProfileDock/ui/components/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Play, Square } from "lucide-react";
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { useCloakInstallation } from "@/features/cloak/api/queries";
import {
	useLaunchProfile,
	useStopProfile,
} from "@/features/profiles/api/mutations";
import {
	useProfile,
	useProfileEvents,
	useProfilePreflight,
} from "@/features/profiles/api/queries";
import { ProfileBrowserTab } from "@/features/profiles/components/profile-browser-tab";
import { ProfileStatusBadge } from "@/features/profiles/components/profile-status-badge";
import { useProfileProxyAssignment } from "@/features/proxies/api/queries";
import {
	AssignProxyDialog,
	ProfileNetworkCard,
} from "@/features/proxies/components/assign-proxy-dialog";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export const Route = createFileRoute("/_app/profiles/$profileId")({
	component: ProfileDetailPage,
});

function ProfileDetailPage() {
	const { profileId } = Route.useParams();
	const profileQuery = useProfile(profileId);
	const eventsQuery = useProfileEvents(profileId);
	const assignmentQuery = useProfileProxyAssignment(profileId);
	const cloakQuery = useCloakInstallation();
	const launchProfile = useLaunchProfile();
	const stopProfile = useStopProfile();
	const [assignOpen, setAssignOpen] = useState(false);
	const [showPreflight, setShowPreflight] = useState(false);
	const preflightQuery = useProfilePreflight(profileId, showPreflight);

	const profile = profileQuery.data;
	const isRunning = profile?.state === "running";

	const handleLaunch = async () => {
		setShowPreflight(true);
		const result = await preflightQuery.refetch();
		if (result.data?.ready === false) {
			return;
		}
		launchProfile.mutate(profileId);
	};

	return (
		<PageShell>
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon-sm" render={<Link to="/profiles" />}>
					<ArrowLeft className="size-4" />
				</Button>
				<div className="flex-1">
					{profileQuery.isLoading ? (
						<Skeleton className="h-7 w-48" />
					) : profile ? (
						<>
							<h2 className="font-medium text-[#eef1f6] text-lg">
								{profile.name}
							</h2>
							<ProfileStatusBadge state={profile.state} />
						</>
					) : null}
				</div>
				{profile ? (
					isRunning ? (
						<Button
							variant="outline"
							className="border-[#252a36]"
							disabled={stopProfile.isPending}
							onClick={() => stopProfile.mutate(profile.id)}
						>
							<Square className="size-3.5" />
							Stop Browser
						</Button>
					) : (
						<Button
							className="bg-sky-600 hover:bg-sky-500"
							disabled={launchProfile.isPending || preflightQuery.isFetching}
							onClick={handleLaunch}
						>
							<Play className="size-3.5" />
							Launch
						</Button>
					)
				) : null}
			</div>

			<DesktopOnlyBanner />

			{preflightQuery.data && !preflightQuery.data.ready ? (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
					Preflight failed.{" "}
					{preflightQuery.data.warnings
						.map((warning) => warning.message)
						.join(" ")}
				</div>
			) : null}

			<Tabs
				defaultValue="overview"
				className="flex min-h-0 flex-1 flex-col gap-4"
			>
				<TabsList className="w-fit bg-[#161b26]">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="browser">Browser</TabsTrigger>
					<TabsTrigger value="network">Network</TabsTrigger>
					<TabsTrigger value="activity">Activity</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-0">
					<div className="grid gap-4 lg:grid-cols-2">
						<Card className={panelClassName}>
							<CardHeader>
								<CardTitle>Overview</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<Row label="Name" value={profile?.name ?? "—"} />
								<Row
									label="Browser"
									value={
										cloakQuery.data?.version
											? `CloakBrowser ${cloakQuery.data.version}`
											: "CloakBrowser"
									}
								/>
								<Row
									label="Compatibility"
									value={
										cloakQuery.data?.compatible
											? "Compatible"
											: cloakQuery.data?.valid
												? "Detected"
												: "Not detected"
									}
								/>
								<Row
									label="Network"
									value={
										assignmentQuery.data?.proxy?.name ?? "No proxy assigned"
									}
								/>
								<Row label="PID" value={profile?.pid?.toString() ?? "—"} />
								<Row
									label="Last opened"
									value={profile?.last_opened_at ?? "—"}
								/>
								<Row label="Description" value={profile?.description ?? "—"} />
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="browser" className="mt-0">
					<ProfileBrowserTab profileId={profileId} isRunning={isRunning} />
				</TabsContent>

				<TabsContent value="network" className="mt-0">
					<ProfileNetworkCard
						profileId={profileId}
						isRunning={isRunning}
						assignment={assignmentQuery.data}
						isLoading={assignmentQuery.isLoading}
						onChangeProxy={() => setAssignOpen(true)}
					/>
				</TabsContent>

				<TabsContent value="activity" className="mt-0">
					<Card className={panelClassName}>
						<CardHeader>
							<CardTitle>Activity</CardTitle>
						</CardHeader>
						<CardContent>
							{eventsQuery.isLoading ? (
								<Skeleton className="h-20 w-full" />
							) : (
								<ul className="space-y-2 text-sm">
									{(eventsQuery.data ?? []).map((event) => (
										<li key={event.id} className="flex justify-between gap-4">
											<span className="text-[#8b93a1]">
												{formatEvent(event.event_type)}
											</span>
											<span className="shrink-0 text-[#8b93a1] text-xs">
												{new Date(event.created_at).toLocaleString()}
											</span>
										</li>
									))}
									{(eventsQuery.data ?? []).length === 0 ? (
										<li className="text-[#8b93a1]">No activity yet</li>
									) : null}
								</ul>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<AssignProxyDialog
				open={assignOpen}
				onOpenChange={setAssignOpen}
				profileId={profileId}
				assignment={assignmentQuery.data}
				isRunning={isRunning}
			/>
		</PageShell>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 border-[#252a36] border-b py-2 last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<span className="text-right text-[#dfe3ea]">{value}</span>
		</div>
	);
}

function formatEvent(eventType: string) {
	return eventType.replaceAll("_", " ");
}
