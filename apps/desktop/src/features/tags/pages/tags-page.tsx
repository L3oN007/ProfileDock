import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { useCreateTag, useDeleteTag, useTags } from "@/features/tags/api/queries";

export function TagsPage() {
	const tagsQuery = useTags();
	const createTag = useCreateTag();
	const deleteTag = useDeleteTag();
	const [name, setName] = useState("");

	return (
		<PageShell>
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Tags</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							className="border-[#252a36] bg-[#0f1117]"
							placeholder="New tag name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<Button
							className="bg-sky-600 hover:bg-sky-500"
							disabled={!name.trim()}
							onClick={() => {
								createTag.mutate({ name }, { onSuccess: () => setName("") });
							}}
						>
							Add Tag
						</Button>
					</div>
					<ul className="space-y-2">
						{(tagsQuery.data ?? []).map((tag) => (
							<li
								key={tag.id}
								className="flex items-center justify-between rounded-md border border-[#252a36] p-3 text-sm"
							>
								<div>
									<p className="text-[#dfe3ea]">{tag.name}</p>
									<p className="text-[#8b93a1] text-xs">
										{tag.profile_count} profiles
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="border-[#252a36] text-red-400"
									onClick={() => deleteTag.mutate(tag.id)}
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
