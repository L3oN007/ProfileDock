import { Button } from "@ProfileDock/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ProfileDock/ui/components/card";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Play, Square } from "lucide-react";
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import {
	AssignProxyDialog,
	ProfileNetworkCard,
} from "@/features/proxies/components/assign-proxy-dialog";
import { useProfileProxyAssignment } from "@/features/proxies/api/queries";
import { useLaunchProfile, useStopProfile } from "@/features/profiles/api/mutations";
import { useProfile, useProfileEvents } from "@/features/profiles/api/queries";
import { ProfileStatusBadge } from "@/features/profiles/components/profile-status-badge";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export const Route = createFileRoute("/_app/profiles/$profileId")({
	component: ProfileDetailPage,
});

function ProfileDetailPage() {
	const { profileId } = Route.useParams();
	const profileQuery = useProfile(profileId);
	const eventsQuery = useProfileEvents(profileId);
	const assignmentQuery = useProfileProxyAssignment(profileId);
	const launchProfile = useLaunchProfile();
	const stopProfile = useStopProfile();
	const [assignOpen, setAssignOpen] = useState(false);

	const profile = profileQuery.data;
	const isRunning = profile?.state === "running";

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
							<h2 className="font-medium text-[#eef1f6] text-lg">{profile.name}</h2>
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
							disabled={launchProfile.isPending}
							onClick={() => launchProfile.mutate(profile.id)}
						>
							<Play className="size-3.5" />
							Launch
						</Button>
					)
				) : null}
			</div>

			<DesktopOnlyBanner />

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className={panelClassName}>
					<CardHeader>
						<CardTitle>Overview</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<Row label="Name" value={profile?.name ?? "—"} />
						<Row label="Browser" value={profile?.browser_provider ?? "—"} />
						<Row label="PID" value={profile?.pid?.toString() ?? "—"} />
						<Row label="Created" value={profile?.created_at ?? "—"} />
						<Row label="Description" value={profile?.description ?? "—"} />
					</CardContent>
				</Card>

				<ProfileNetworkCard
					profileId={profileId}
					isRunning={isRunning}
					assignment={assignmentQuery.data}
					isLoading={assignmentQuery.isLoading}
					onChangeProxy={() => setAssignOpen(true)}
				/>

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
			</div>

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
