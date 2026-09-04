import { Button } from "@ProfileDock/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ProfileDock/ui/components/dialog";
import { Input } from "@ProfileDock/ui/components/input";
import { Label } from "@ProfileDock/ui/components/label";
import { Textarea } from "@ProfileDock/ui/components/textarea";
import { useState } from "react";

import { useCreateProfile } from "@/features/profiles/api/mutations";

interface CreateProfileDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateProfileDialog({
	open,
	onOpenChange,
}: CreateProfileDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const createProfile = useCreateProfile();

	const handleCreate = async () => {
		await createProfile.mutateAsync({
			name,
			description: description || undefined,
		});
		setName("");
		setDescription("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-border bg-card sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create Profile</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="profile-name">Name</Label>
						<Input
							id="profile-name"
							placeholder="QA Browser 01"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Description</Label>
						<Textarea
							placeholder="Optional notes"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						disabled={!name.trim() || createProfile.isPending}
						onClick={handleCreate}
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
