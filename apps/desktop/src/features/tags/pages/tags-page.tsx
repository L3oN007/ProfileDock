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
							className="border-border bg-background"
							placeholder="New tag name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<Button
							className="bg-primary text-primary-foreground hover:bg-primary/90"
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
								className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
							>
								<div>
									<p className="text-foreground">{tag.name}</p>
									<p className="text-muted-foreground text-xs">
										{tag.profile_count} profiles
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="border-border text-red-400"
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
