import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ProfileDock/ui/components/table";
import { Link } from "@tanstack/react-router";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { useProfileActivity } from "@/features/profiles/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function ActivityPage() {
	const activityQuery = useProfileActivity();
	const events = activityQuery.data ?? [];

	return (
		<PageShell>
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Activity</CardTitle>
				</CardHeader>
				<CardContent>
					{events.length === 0 ? (
						<p className="text-[#8b93a1] text-sm">No activity yet.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>Profile</TableHead>
									<TableHead>Event</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{events.map((event) => (
									<TableRow key={event.id}>
										<TableCell className="text-[#8b93a1] text-xs">
											{new Date(event.created_at).toLocaleString()}
										</TableCell>
										<TableCell>
											<Link
												to="/profiles/$profileId"
												params={{ profileId: event.profile_id }}
												className="text-[#dfe3ea] hover:text-sky-400"
											>
												{event.display_id ?? event.profile_name}
											</Link>
										</TableCell>
										<TableCell className="text-[#dfe3ea]">
											{event.event_type.replaceAll("_", " ")}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
