import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { Archive, Tag } from "lucide-react";
import { useState } from "react";

import { useGroups } from "@/features/groups/api/queries";
import { useProxies } from "@/features/proxies/api/queries";

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

	if (selectedCount === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2 border-[#252a36] border-t bg-[#171b24] px-4 py-2">
			<span className="text-[#dfe3ea] text-sm">{selectedCount} selected</span>

			<select
				className="h-8 rounded-md border border-[#252a36] bg-[#0f1117] px-2 text-sm"
				defaultValue=""
				disabled={isPending}
				onChange={(e) => {
					const value = e.target.value;
					onMoveGroup(value || null);
					e.target.value = "";
				}}
			>
				<option value="">Move to group...</option>
				<option value="__ungrouped__">Ungrouped</option>
				{(groupsQuery.data ?? []).map((group) => (
					<option key={group.id} value={group.id}>
						{group.name}
					</option>
				))}
			</select>

			<div className="flex items-center gap-1">
				<Input
					className="h-8 w-36 border-[#252a36] bg-[#0f1117]"
					placeholder="Add tag"
					value={tagInput}
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
					className="border-[#252a36]"
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
					className="border-[#252a36]"
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

			<select
				className="h-8 rounded-md border border-[#252a36] bg-[#0f1117] px-2 text-sm"
				defaultValue=""
				disabled={isPending}
				onChange={(e) => {
					const value = e.target.value;
					if (value === "__none__") {
						onAssignProxy(null);
					} else if (value) {
						onAssignProxy(value);
					}
					e.target.value = "";
				}}
			>
				<option value="">Assign proxy...</option>
				<option value="__none__">No proxy</option>
				{(proxiesQuery.data ?? []).map((proxy) => (
					<option key={proxy.id} value={proxy.id}>
						{proxy.name}
					</option>
				))}
			</select>

			<Button
				size="sm"
				variant="outline"
				className="border-[#252a36]"
				disabled={isPending}
				onClick={onArchive}
			>
				<Archive className="size-3.5" />
				Move to trash
			</Button>
		</div>
	);
}
