import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { Button } from "@ProfileDock/ui/components/button";
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
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
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Groups</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							className="border-[#252a36] bg-[#0f1117]"
							placeholder="New group name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<Button
							className="bg-sky-600 hover:bg-sky-500"
							disabled={!name.trim()}
							onClick={() => {
								createGroup.mutate({ name }, { onSuccess: () => setName("") });
							}}
						>
							Add Group
						</Button>
					</div>
					<ul className="space-y-2">
						{(groupsQuery.data ?? []).map((group) => (
							<li
								key={group.id}
								className="flex items-center justify-between rounded-md border border-[#252a36] p-3 text-sm"
							>
								<div>
									<p className="text-[#dfe3ea]">{group.name}</p>
									<p className="text-[#8b93a1] text-xs">
										{group.profile_count} profiles
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="border-[#252a36] text-red-400"
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
