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

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { useProfileActivity } from "@/features/profiles/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function ActivityPage() {
	const activityQuery = useProfileActivity();

	return (
		<PageShell>
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Activity</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Time</TableHead>
								<TableHead>Profile</TableHead>
								<TableHead>Event</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(activityQuery.data ?? []).map((event) => (
								<TableRow key={event.id}>
									<TableCell className="text-[#8b93a1] text-xs">
										{new Date(event.created_at).toLocaleString()}
									</TableCell>
									<TableCell>
										{event.display_id ?? event.profile_name}
									</TableCell>
									<TableCell className="text-[#dfe3ea]">
										{event.event_type.replaceAll("_", " ")}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</PageShell>
	);
}
