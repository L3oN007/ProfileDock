import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { Archive, Tag } from "lucide-react";
import { useState } from "react";

import { useGroups } from "@/features/groups/api/queries";
import { useProxies } from "@/features/proxies/api/queries";
import { FilterSelect } from "@/features/shared/filter-select";
import { notion } from "@/app/design/system";

const PICK = "pick";

interface BulkActionsBarProps {
	selectedCount: number;
	onMoveGroup: (groupId: string | null) => void;
	onAddTags: (tags: string[]) => void;
	onRemoveTags: (tags: string[]) => void;
	onAssignProxy: (proxyId: string | null) => void;
	onArchive: () => void;
	isPending?: boolean;
}

export function BulkActionsBar({
	selectedCount,
	onMoveGroup,
	onAddTags,
	onRemoveTags,
	onAssignProxy,
	onArchive,
	isPending,
}: BulkActionsBarProps) {
	const groupsQuery = useGroups();
	const proxiesQuery = useProxies();
	const [tagInput, setTagInput] = useState("");
	const [groupPick, setGroupPick] = useState(PICK);
	const [proxyPick, setProxyPick] = useState(PICK);

	if (selectedCount === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2 border-border border-b bg-primary/5 px-5 py-2.5">
			<span className="font-medium text-foreground text-sm">{selectedCount} selected</span>

			<FilterSelect
				value={groupPick}
				onValueChange={(value) => {
					if (value === PICK) return;
					onMoveGroup(value === "__ungrouped__" ? null : value);
					setGroupPick(PICK);
				}}
				className="min-w-[148px]"
				options={[
					{ value: PICK, label: "Move to group..." },
					{ value: "__ungrouped__", label: "Ungrouped" },
					...(groupsQuery.data ?? []).map((group) => ({
						value: group.id,
						label: group.name,
					})),
				]}
			/>

			<div className="flex items-center gap-1">
				<Input
					className={`w-36 ${notion.input}`}
					placeholder="Add tag"
					value={tagInput}
					disabled={isPending}
					onChange={(e) => setTagInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							const value = tagInput.trim();
							if (!value) return;
							onAddTags([value]);
							setTagInput("");
						}
					}}
				/>
				<Button
					size="sm"
					variant="outline"
					disabled={!tagInput.trim() || isPending}
					onClick={() => {
						const value = tagInput.trim();
						if (!value) return;
						onAddTags([value]);
						setTagInput("");
					}}
				>
					<Tag className="size-3.5" />
					Add tag
				</Button>
				<Button
					size="sm"
					variant="outline"
					disabled={!tagInput.trim() || isPending}
					onClick={() => {
						const value = tagInput.trim();
						if (!value) return;
						onRemoveTags([value]);
						setTagInput("");
					}}
				>
					Remove tag
				</Button>
			</div>

			<FilterSelect
				value={proxyPick}
				onValueChange={(value) => {
					if (value === PICK) return;
					onAssignProxy(value === "__none__" ? null : value);
					setProxyPick(PICK);
				}}
				className="min-w-[148px]"
				options={[
					{ value: PICK, label: "Assign proxy..." },
					{ value: "__none__", label: "No proxy" },
					...(proxiesQuery.data ?? []).map((proxy) => ({
						value: proxy.id,
						label: proxy.name,
					})),
				]}
			/>

			<Button
				size="sm"
				variant="outline"
				disabled={isPending}
				onClick={onArchive}
			>
				<Archive className="size-3.5" />
				Move to trash
			</Button>
		</div>
	);
}
