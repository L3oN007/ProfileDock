import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { useState } from "react";

import { notion } from "@/app/design/system";
import {
	ContentSection,
	EmptyState,
	ListRow,
	PageShell,
	PageTitle,
} from "@/app/layout/page-shell";
import {
	useDeleteProfilePermanent,
	useRestoreProfile,
} from "@/features/profiles/api/mutations";
import { useProfileListPage } from "@/features/profiles/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function TrashPage() {
	const [confirmName, setConfirmName] = useState<string | null>(null);
	const [confirmInput, setConfirmInput] = useState("");
	const profilesQuery = useProfileListPage({
		includeArchived: true,
		page: 1,
		pageSize: 100,
	});
	const restoreProfile = useRestoreProfile();
	const deletePermanent = useDeleteProfilePermanent();

	const profiles = profilesQuery.data?.items ?? [];

	return (
		<PageShell>
			<PageTitle
				title="Trash"
				description="Archived profiles can be restored or permanently deleted."
			/>
			<DesktopOnlyBanner />
			<ContentSection title="Archived profiles">
				{profiles.length === 0 ? (
					<EmptyState
						title="Trash is empty"
						description="Archived profiles will appear here."
					/>
				) : (
					<div className="space-y-2">
						{profiles.map((profile) => (
							<ListRow key={profile.id}>
								<div>
									<p className="font-medium text-foreground text-sm">
										{profile.name}
									</p>
									<p className="text-muted-foreground text-xs">
										{profile.display_id ?? profile.id}
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => restoreProfile.mutate(profile.id)}
									>
										Restore
									</Button>
									<Button
										size="sm"
										variant="outline"
										className="text-destructive hover:text-destructive"
										onClick={() => {
											setConfirmName(profile.name);
											setConfirmInput("");
										}}
									>
										Delete permanently
									</Button>
								</div>
							</ListRow>
						))}
					</div>
				)}
			</ContentSection>

			{confirmName ? (
				<ContentSection
					className="mt-4"
					title="Delete permanently?"
					description={`Type "${confirmName}" to confirm permanent deletion.`}
				>
					<div className="space-y-3">
						<Input
							className={notion.input}
							value={confirmInput}
							onChange={(e) => setConfirmInput(e.target.value)}
						/>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setConfirmName(null)}>
								Cancel
							</Button>
							<Button
								variant="destructive"
								disabled={confirmInput !== confirmName}
								onClick={() => {
									const profile = profiles.find((p) => p.name === confirmName);
									if (profile) {
										deletePermanent.mutate(profile.id);
									}
									setConfirmName(null);
								}}
							>
								Delete permanently
							</Button>
						</div>
					</div>
				</ContentSection>
			) : null}
		</PageShell>
	);
}
