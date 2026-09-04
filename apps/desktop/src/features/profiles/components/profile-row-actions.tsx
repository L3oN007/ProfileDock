import { Button } from "@ProfileDock/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Archive, Copy, Pencil } from "lucide-react";

import {
	useArchiveProfile,
	useStopProfile,
} from "@/features/profiles/api/mutations";
import type { Profile } from "@/types/profile";

interface ProfileRowActionsProps {
	profile: Profile;
	onDuplicate?: () => void;
}

export function ProfileRowActions({
	profile,
	onDuplicate,
}: ProfileRowActionsProps) {
	const archiveProfile = useArchiveProfile();
	const stopProfile = useStopProfile();
	const isRunning = profile.state === "running";

	return (
		<div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1 shadow-lg">
			<Button
				size="sm"
				variant="ghost"
				className="justify-start"
				render={
					<Link to="/profiles/$profileId" params={{ profileId: profile.id }} />
				}
			>
				<Pencil className="size-3.5" />
				Edit
			</Button>
			{onDuplicate ? (
				<Button
					size="sm"
					variant="ghost"
					className="justify-start"
					onClick={onDuplicate}
				>
					<Copy className="size-3.5" />
					Duplicate
				</Button>
			) : null}
			{isRunning ? (
				<Button
					size="sm"
					variant="ghost"
					className="justify-start"
					onClick={() => stopProfile.mutate(profile.id)}
				>
					Stop browser
				</Button>
			) : (
				<Button
					size="sm"
					variant="ghost"
					className="justify-start text-amber-300"
					onClick={() => archiveProfile.mutate(profile.id)}
				>
					<Archive className="size-3.5" />
					Move to trash
				</Button>
			)}
		</div>
	);
}
