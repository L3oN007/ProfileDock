import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { Button } from "@ProfileDock/ui/components/button";
import { useState } from "react";

import { PageShell, PageTitle, panelClassName } from "@/app/layout/page-shell";
import { notion } from "@/app/design/system";
import {
	useCreateGroup,
	useDeleteGroup,
	useGroups,
} from "@/features/groups/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function GroupsPage() {
	const groupsQuery = useGroups();
	const createGroup = useCreateGroup();
	const deleteGroup = useDeleteGroup();
	const [name, setName] = useState("");

	return (
		<PageShell>
			<PageTitle
				title="Groups"
				description="Organize profiles into shared groups for filtering and bulk actions."
			/>
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle className="text-base">All groups</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							className={notion.input}
							placeholder="New group name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<Button
							disabled={!name.trim()}
							onClick={() => {
								createGroup.mutate({ name }, { onSuccess: () => setName("") });
							}}
						>
							Add group
						</Button>
					</div>
					<ul className="space-y-2">
						{(groupsQuery.data ?? []).map((group) => (
							<li
								key={group.id}
								className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
							>
								<div>
									<p className="text-foreground">{group.name}</p>
									<p className="text-muted-foreground text-xs">
										{group.profile_count} profiles
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="border-border text-red-400"
									onClick={() => deleteGroup.mutate(group.id)}
								>
									Delete
								</Button>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		</PageShell>
	);
}
