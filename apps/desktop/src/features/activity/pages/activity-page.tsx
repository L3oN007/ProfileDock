import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ProfileDock/ui/components/table";
import { RouterLink } from "@/components/router-link";

import { notion } from "@/app/design/system";
import {
	ContentSection,
	EmptyState,
	PageShell,
	PageTitle,
} from "@/app/layout/page-shell";
import { useProfileActivity } from "@/features/profiles/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function ActivityPage() {
	const activityQuery = useProfileActivity();
	const events = activityQuery.data ?? [];

	return (
		<PageShell>
			<PageTitle
				title="Activity"
				description="Recent profile events across your workspace."
			/>
			<DesktopOnlyBanner />
			<ContentSection title="Recent events" contentClassName="p-0">
				{events.length === 0 ? (
					<div className="px-5 py-4">
						<EmptyState
							title="No activity yet"
							description="Profile launches, stops, and edits will show up here."
						/>
					</div>
				) : (
					<div className={notion.tableWrap}>
						<Table>
							<TableHeader>
								<TableRow className={notion.tableHead}>
									<TableHead>Time</TableHead>
									<TableHead>Profile</TableHead>
									<TableHead>Event</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{events.map((event) => (
									<TableRow key={event.id} className={notion.tableRow}>
										<TableCell className="text-muted-foreground text-xs">
											{new Date(event.created_at).toLocaleString()}
										</TableCell>
										<TableCell>
											<RouterLink
												to="/profiles/$profileId"
												params={{ profileId: event.profile_id }}
												className="text-foreground hover:text-primary"
											>
												{event.display_id ?? event.profile_name}
											</RouterLink>
										</TableCell>
										<TableCell className="text-foreground">
											{event.event_type.replaceAll("_", " ")}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</ContentSection>
		</PageShell>
	);
}
