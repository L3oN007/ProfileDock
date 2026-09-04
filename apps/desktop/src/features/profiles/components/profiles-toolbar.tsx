import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { Archive, Play, Plus, Search, Square } from "lucide-react";
import type { ReactNode, RefObject } from "react";

import { notion } from "@/app/design/system";
import { ColumnSettings } from "@/features/profiles/components/column-settings";
import type {
	ProfileColumnId,
	ProfileListDensity,
} from "@/features/profiles/hooks/use-profile-list-preferences";

interface ProfilesToolbarProps {
	search: string;
	searchInputRef?: RefObject<HTMLInputElement | null>;
	onSearchChange: (value: string) => void;
	selectedCount: number;
	canOpen: boolean;
	canClose: boolean;
	onOpen: () => void;
	onClose: () => void;
	onArchive: () => void;
	onCreate: () => void;
	isOpening: boolean;
	isClosing: boolean;
	columns: ProfileColumnId[];
	density: ProfileListDensity;
	onToggleColumn: (columnId: ProfileColumnId) => void;
	onDensityChange: (density: ProfileListDensity) => void;
	extra?: ReactNode;
}

export function ProfilesToolbar({
	search,
	searchInputRef,
	onSearchChange,
	selectedCount,
	canOpen,
	canClose,
	onOpen,
	onClose,
	onArchive,
	onCreate,
	isOpening,
	isClosing,
	columns,
	density,
	onToggleColumn,
	onDensityChange,
	extra,
}: ProfilesToolbarProps) {
	return (
		<div className="space-y-3 border-border border-b bg-background px-5 py-4">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-[220px] max-w-md flex-1">
					<Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						className={`${notion.input} pl-8`}
						placeholder="Search profiles"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
				</div>

				<div className="ml-auto flex flex-wrap items-center gap-1.5">
					<Button size="sm" onClick={onCreate}>
						<Plus className="size-3.5" />
						New
					</Button>
					<Button
						size="sm"
						variant="ghost"
						disabled={!canOpen || isOpening}
						onClick={onOpen}
					>
						<Play className="size-3.5" />
						Open
					</Button>
					<Button
						size="sm"
						variant="ghost"
						disabled={!canClose || isClosing}
						onClick={onClose}
					>
						<Square className="size-3.5" />
						Close
					</Button>
					<Button
						size="sm"
						variant="ghost"
						disabled={selectedCount === 0}
						onClick={onArchive}
					>
						<Archive className="size-3.5" />
						Archive
					</Button>
					<div className="mx-1 h-4 w-px bg-border" />
					<ColumnSettings
						columns={columns}
						density={density}
						onToggleColumn={onToggleColumn}
						onDensityChange={onDensityChange}
					/>
					{extra}
				</div>
			</div>
		</div>
	);
}
