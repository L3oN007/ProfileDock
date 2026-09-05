import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { useEffect, useMemo, useState } from "react";

import { notion } from "@/app/design/system";
import { SectionBlock } from "@/app/layout/page-shell";
import { useGroups } from "@/features/groups/api/queries";
import { useUpdateProfileFull } from "@/features/profiles/api/mutations";
import {
	TagPicker,
	type SelectedTag,
} from "@/features/tags/components/tag-picker";
import { FormField } from "@/features/shared/form-field";
import { FormSelect } from "@/features/shared/form-select";
import type { Profile } from "@/types/profile";

const NONE_VALUE = "__none__";

interface ProfileEditCardProps {
	profile: Profile;
}

function profileTagsToSelected(tags: Profile["tags"]): SelectedTag[] {
	return tags.map((tag) => ({
		id: tag.id,
		name: tag.name,
		color: tag.color,
	}));
}

export function ProfileEditCard({ profile }: ProfileEditCardProps) {
	const groupsQuery = useGroups();
	const updateProfile = useUpdateProfileFull();
	const [name, setName] = useState(profile.name);
	const [groupId, setGroupId] = useState(profile.group_id ?? NONE_VALUE);
	const [remark, setRemark] = useState(profile.remark ?? "");
	const [notes, setNotes] = useState(profile.notes ?? "");
	const [platformLabel, setPlatformLabel] = useState(
		profile.platform_label ?? "",
	);
	const [tagItems, setTagItems] = useState<SelectedTag[]>(
		profileTagsToSelected(profile.tags),
	);

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
		setTagItems(profileTagsToSelected(profile.tags));
	}, [profile]);

	const handleSave = () => {
		updateProfile.mutate({
			id: profile.id,
			input: {
				name: name.trim(),
				groupId: groupId === NONE_VALUE ? null : groupId,
				tagItems,
				tags: tagItems.map((tag) => tag.name),
				remark,
				notes,
				platformLabel,
			},
		});
	};

	return (
		<SectionBlock
			title="Profile details"
			description="Update metadata and organization for this profile."
			inset
		>
			<div className="space-y-5">
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
					<TagPicker value={tagItems} onChange={setTagItems} />
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
				<Button onClick={handleSave} disabled={updateProfile.isPending}>
					Save changes
				</Button>
			</div>
		</SectionBlock>
	);
}
