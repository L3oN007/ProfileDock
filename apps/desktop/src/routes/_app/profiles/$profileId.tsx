import { Button } from "@ProfileDock/ui/components/button";
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

import {
	DetailRow,
	PageShell,
	PageTitle,
	SectionBlock,
} from "@/app/layout/page-shell";
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
import { ProfileCookiesCard } from "@/features/profiles/components/profile-cookies-card";
import { ProfileDeviceCard } from "@/features/profiles/components/profile-device-card";
import { ProfileEditCard } from "@/features/profiles/components/profile-edit-card";
import { ProfileStatusBadge } from "@/features/profiles/components/profile-status-badge";
import { ProfileStorageCard } from "@/features/profiles/components/profile-storage-card";
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
			<PageTitle
				title={
					profileQuery.isLoading
						? "Loading profile..."
						: (profile?.name ?? "Profile")
				}
				description={profile?.display_id ?? profile?.id}
				actions={
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon-sm"
							render={<Link to="/profiles" />}
						>
							<ArrowLeft className="size-4" />
						</Button>
						{profile ? <ProfileStatusBadge state={profile.state} /> : null}
						{profile ? (
							isRunning ? (
								<Button
									variant="outline"
									disabled={stopProfile.isPending}
									onClick={() => stopProfile.mutate(profile.id)}
								>
									<Square className="size-3.5" />
									Stop
								</Button>
							) : (
								<Button
									disabled={
										launchProfile.isPending || preflightQuery.isFetching
									}
									onClick={handleLaunch}
								>
									<Play className="size-3.5" />
									Launch
								</Button>
							)
						) : null}
					</div>
				}
			/>

			<DesktopOnlyBanner />

			{preflightQuery.data && !preflightQuery.data.ready ? (
				<div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
					Preflight failed.{" "}
					{preflightQuery.data.warnings
						.map((warning) => warning.message)
						.join(" ")}
				</div>
			) : null}

			<Tabs
				defaultValue="overview"
				className="flex min-h-0 flex-1 flex-col gap-6"
			>
				<TabsList
					variant="line"
					className="h-auto w-full justify-start gap-6 rounded-none border-border/60 border-b bg-transparent p-0"
				>
					<TabsTrigger
						value="overview"
						className="rounded-none bg-transparent shadow-none"
					>
						Overview
					</TabsTrigger>
					<TabsTrigger
						value="browser"
						className="rounded-none bg-transparent shadow-none"
					>
						Browser
					</TabsTrigger>
					<TabsTrigger
						value="device"
						className="rounded-none bg-transparent shadow-none"
					>
						Device
					</TabsTrigger>
					<TabsTrigger
						value="network"
						className="rounded-none bg-transparent shadow-none"
					>
						Network
					</TabsTrigger>
					<TabsTrigger
						value="activity"
						className="rounded-none bg-transparent shadow-none"
					>
						Activity
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-0">
					<div className="grid gap-8 lg:grid-cols-2">
						{profile ? (
							<ProfileEditCard profile={profile} />
						) : (
							<Skeleton className="h-64 w-full rounded-xl" />
						)}
						<SectionBlock title="Session" inset>
							<div>
								<DetailRow
									label="Browser"
									value={
										cloakQuery.data?.version
											? `CloakBrowser ${cloakQuery.data.version}`
											: "CloakBrowser"
									}
								/>
								<DetailRow
									label="Compatibility"
									value={
										cloakQuery.data?.compatible
											? "Compatible"
											: cloakQuery.data?.valid
												? "Detected"
												: "Not detected"
									}
								/>
								<DetailRow
									label="Network"
									value={
										assignmentQuery.data?.proxy?.name ?? "No proxy assigned"
									}
								/>
								<DetailRow
									label="PID"
									value={profile?.pid?.toString() ?? "—"}
								/>
								<DetailRow
									label="Last opened"
									value={profile?.last_opened_at ?? "—"}
								/>
							</div>
						</SectionBlock>
						<ProfileStorageCard profileId={profileId} isRunning={isRunning} />
					</div>
				</TabsContent>

				<TabsContent value="browser" className="mt-0 space-y-8">
					<ProfileBrowserTab profileId={profileId} isRunning={isRunning} />
					<ProfileCookiesCard profileId={profileId} />
				</TabsContent>

				<TabsContent value="device" className="mt-0">
					<ProfileDeviceCard profileId={profileId} isRunning={isRunning} />
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
					<SectionBlock title="Activity">
						{eventsQuery.isLoading ? (
							<Skeleton className="h-20 w-full rounded-lg" />
						) : (
							<ul className="divide-y divide-border/50">
								{(eventsQuery.data ?? []).map((event) => (
									<li
										key={event.id}
										className="flex justify-between gap-4 py-3 text-sm"
									>
										<span className="text-muted-foreground">
											{formatEvent(event.event_type)}
										</span>
										<span className="shrink-0 text-muted-foreground text-xs">
											{new Date(event.created_at).toLocaleString()}
										</span>
									</li>
								))}
								{(eventsQuery.data ?? []).length === 0 ? (
									<li className="py-6 text-center text-muted-foreground text-sm">
										No activity yet
									</li>
								) : null}
							</ul>
						)}
					</SectionBlock>
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

function formatEvent(eventType: string) {
	return eventType.replaceAll("_", " ");
}
