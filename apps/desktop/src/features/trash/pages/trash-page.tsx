import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
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
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Trash</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{profiles.length === 0 ? (
						<p className="text-[#8b93a1] text-sm">No archived profiles.</p>
					) : (
						profiles.map((profile) => (
							<div
								key={profile.id}
								className="flex items-center justify-between rounded-md border border-[#252a36] p-3"
							>
								<div>
									<p className="text-[#dfe3ea] text-sm">{profile.name}</p>
									<p className="text-[#8b93a1] text-xs">
										{profile.display_id ?? profile.id}
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										className="border-[#252a36]"
										onClick={() => restoreProfile.mutate(profile.id)}
									>
										Restore
									</Button>
									<Button
										size="sm"
										variant="outline"
										className="border-[#252a36] text-red-400"
										onClick={() => {
											setConfirmName(profile.name);
											setConfirmInput("");
										}}
									>
										Delete permanently
									</Button>
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>

			{confirmName ? (
				<Card className={`${panelClassName} mt-4`}>
					<CardHeader>
						<CardTitle className="text-base">Delete permanently?</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-[#8b93a1] text-sm">
							Type <strong>{confirmName}</strong> to confirm permanent deletion.
						</p>
						<input
							className="h-9 w-full rounded-md border border-[#252a36] bg-[#0f1117] px-3 text-sm"
							value={confirmInput}
							onChange={(e) => setConfirmInput(e.target.value)}
						/>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="border-[#252a36]"
								onClick={() => setConfirmName(null)}
							>
								Cancel
							</Button>
							<Button
								className="bg-red-600 hover:bg-red-500"
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
					</CardContent>
				</Card>
			) : null}
		</PageShell>
	);
}
