import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { Label } from "@ProfileDock/ui/components/label";
import { useEffect, useState, type ReactNode } from "react";

import { panelClassName } from "@/app/layout/page-shell";
import { useGroups } from "@/features/groups/api/queries";
import { useUpdateProfileFull } from "@/features/profiles/api/mutations";
import type { Profile } from "@/types/profile";

interface ProfileEditCardProps {
	profile: Profile;
}

export function ProfileEditCard({ profile }: ProfileEditCardProps) {
	const groupsQuery = useGroups();
	const updateProfile = useUpdateProfileFull();
	const [name, setName] = useState(profile.name);
	const [groupId, setGroupId] = useState(profile.group_id ?? "");
	const [remark, setRemark] = useState(profile.remark ?? "");
	const [notes, setNotes] = useState(profile.notes ?? "");
	const [platformLabel, setPlatformLabel] = useState(profile.platform_label ?? "");
	const [tags, setTags] = useState<string[]>(profile.tags);
	const [tagInput, setTagInput] = useState("");

	useEffect(() => {
		setName(profile.name);
		setGroupId(profile.group_id ?? "");
		setRemark(profile.remark ?? "");
		setNotes(profile.notes ?? "");
		setPlatformLabel(profile.platform_label ?? "");
		setTags(profile.tags);
	}, [profile]);

	const addTag = () => {
		const value = tagInput.trim();
		if (!value) return;
		setTags((current) => [...new Set([...current, value])]);
		setTagInput("");
	};

	const handleSave = () => {
		updateProfile.mutate({
			id: profile.id,
			input: {
				name: name.trim(),
				groupId: groupId || null,
				tags,
				remark,
				notes,
				platformLabel,
			},
		});
	};

	return (
		<Card className={panelClassName}>
			<CardHeader>
				<CardTitle>Profile details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Field label="Display ID">
					<Input
						className="border-[#252a36] bg-[#0f1117]"
						value={profile.display_id ?? profile.id}
						disabled
					/>
				</Field>
				<Field label="Name">
					<Input
						className="border-[#252a36] bg-[#0f1117]"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<Field label="Group">
					<select
						className="h-9 w-full rounded-md border border-[#252a36] bg-[#0f1117] px-3 text-sm"
						value={groupId}
						onChange={(e) => setGroupId(e.target.value)}
					>
						<option value="">Ungrouped</option>
						{(groupsQuery.data ?? []).map((group) => (
							<option key={group.id} value={group.id}>
								{group.name}
							</option>
						))}
					</select>
				</Field>
				<Field label="Platform label">
					<Input
						className="border-[#252a36] bg-[#0f1117]"
						value={platformLabel}
						onChange={(e) => setPlatformLabel(e.target.value)}
					/>
				</Field>
				<Field label="Tags">
					<div className="flex gap-2">
						<Input
							className="border-[#252a36] bg-[#0f1117]"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addTag();
								}
							}}
						/>
						<Button variant="outline" className="border-[#252a36]" onClick={addTag}>
							Add
						</Button>
					</div>
					<div className="mt-2 flex flex-wrap gap-2">
						{tags.map((tag) => (
							<button
								key={tag}
								type="button"
								className="rounded-full bg-[#1e2230] px-2 py-1 text-[#dfe3ea] text-xs"
								onClick={() => setTags((current) => current.filter((item) => item !== tag))}
							>
								{tag} ×
							</button>
						))}
					</div>
				</Field>
				<Field label="Remark">
					<Input
						className="border-[#252a36] bg-[#0f1117]"
						value={remark}
						onChange={(e) => setRemark(e.target.value)}
					/>
				</Field>
				<Field label="Notes">
					<textarea
						className="min-h-28 w-full rounded-md border border-[#252a36] bg-[#0f1117] p-3 text-sm"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</Field>
				<div className="flex justify-end">
					<Button
						className="bg-sky-600 hover:bg-sky-500"
						disabled={!name.trim() || updateProfile.isPending}
						onClick={handleSave}
					>
						Save changes
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-2">
			<Label className="text-[#8b93a1]">{label}</Label>
			{children}
		</div>
	);
}
