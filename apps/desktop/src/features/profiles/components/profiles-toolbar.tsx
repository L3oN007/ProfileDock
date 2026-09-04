import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { Archive, Play, Plus, Search, Square } from "lucide-react";

interface ProfilesToolbarProps {
	search: string;
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
}

export function ProfilesToolbar({
	search,
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
}: ProfilesToolbarProps) {
	return (
		<div className="space-y-3 border-[#1e2230] border-b bg-[#12161f] px-4 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					size="sm"
					onClick={onCreate}
					className="bg-sky-600 hover:bg-sky-500"
				>
					<Plus className="size-3.5" />
					New Profile
				</Button>

				<div className="mx-1 h-5 w-px bg-[#252a36]" />

				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36] bg-transparent"
					disabled={!canOpen || isOpening}
					onClick={onOpen}
				>
					<Play className="size-3.5" />
					Open
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36] bg-transparent"
					disabled={!canClose || isClosing}
					onClick={onClose}
				>
					<Square className="size-3.5" />
					Close
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36] bg-transparent"
					disabled={selectedCount === 0}
					onClick={onArchive}
				>
					<Archive className="size-3.5" />
					Archive
				</Button>
			</div>

			<div className="relative max-w-md">
				<Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8b93a1]" />
				<Input
					className="h-8 border-[#252a36] bg-[#0f1117] pl-8"
					placeholder="Search profiles..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>
		</div>
	);
}
