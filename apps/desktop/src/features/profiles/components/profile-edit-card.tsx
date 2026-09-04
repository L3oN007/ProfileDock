import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { notion } from "@/app/design/system";
import { useGroups } from "@/features/groups/api/queries";
import { useUpdateProfileFull } from "@/features/profiles/api/mutations";
import { FormField } from "@/features/shared/form-field";
import { FormSelect } from "@/features/shared/form-select";
import type { Profile } from "@/types/profile";

const NONE_VALUE = "__none__";

interface ProfileEditCardProps {
	profile: Profile;
}

export function ProfileEditCard({ profile }: ProfileEditCardProps) {
	const groupsQuery = useGroups();
	const updateProfile = useUpdateProfileFull();
	const [name, setName] = useState(profile.name);
	const [groupId, setGroupId] = useState(profile.group_id ?? NONE_VALUE);
	const [remark, setRemark] = useState(profile.remark ?? "");
	const [notes, setNotes] = useState(profile.notes ?? "");
	const [platformLabel, setPlatformLabel] = useState(profile.platform_label ?? "");
	const [tags, setTags] = useState<string[]>(profile.tags);
	const [tagInput, setTagInput] = useState("");

	const groupOptions = useMemo(
		() => [
			{ value: NONE_VALUE, label: "Ungrouped" },
			...(groupsQuery.data ?? []).map((group) => ({
				value: group.id,
				label: group.name,
			})),
		],
		[groupsQuery.data],
	);

	useEffect(() => {
		setName(profile.name);
		setGroupId(profile.group_id ?? NONE_VALUE);
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

	const removeTag = (tag: string) => {
		setTags((current) => current.filter((item) => item !== tag));
	};

	const handleSave = () => {
		updateProfile.mutate({
			id: profile.id,
			input: {
				name: name.trim(),
				groupId: groupId === NONE_VALUE ? null : groupId,
				tags,
				remark,
				notes,
				platformLabel,
			},
		});
	};

	return (
		<section className={notion.surface}>
			<div className="px-5 py-4">
				<h2 className="font-medium text-base text-foreground">Profile details</h2>
				<p className="mt-0.5 text-muted-foreground text-sm">
					Update metadata and organization for this profile.
				</p>
			</div>
			<div className="space-y-5 px-5 pb-5">
				<FormField label="Display ID">
					<Input
						className={notion.input}
						value={profile.display_id ?? profile.id}
						disabled
					/>
				</FormField>
				<FormField label="Name">
					<Input
						className={notion.input}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</FormField>
				<FormField label="Group">
					<FormSelect
						value={groupId}
						onValueChange={setGroupId}
						options={groupOptions}
					/>
				</FormField>
				<FormField label="Platform label">
					<Input
						className={notion.input}
						value={platformLabel}
						onChange={(e) => setPlatformLabel(e.target.value)}
					/>
				</FormField>
				<FormField label="Tags">
					<div className="flex gap-2">
						<Input
							className={notion.input}
							placeholder="Add a tag"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addTag();
								}
							}}
						/>
						<Button variant="outline" onClick={addTag}>
							Add
						</Button>
					</div>
					{tags.length > 0 ? (
						<div className="flex flex-wrap gap-1.5 pt-2">
							{tags.map((tag) => (
								<Badge key={tag} variant="neutral" className="gap-1 pr-1.5">
									{tag}
									<button
										type="button"
										className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										onClick={() => removeTag(tag)}
										aria-label={`Remove ${tag}`}
									>
										<X className="size-3" />
									</button>
								</Badge>
							))}
						</div>
					) : null}
				</FormField>
				<FormField label="Remark">
					<Input
						className={notion.input}
						value={remark}
						onChange={(e) => setRemark(e.target.value)}
					/>
				</FormField>
				<FormField label="Notes">
					<textarea
						className={notion.textarea}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</FormField>
				<div className="flex justify-end pt-1">
					<Button
						disabled={!name.trim() || updateProfile.isPending}
						onClick={handleSave}
					>
						Save changes
					</Button>
				</div>
			</div>
		</section>
	);
}
