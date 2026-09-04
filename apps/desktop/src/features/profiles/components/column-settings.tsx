import { Button } from "@ProfileDock/ui/components/button";
import { Checkbox } from "@ProfileDock/ui/components/checkbox";
import { Columns3 } from "lucide-react";
import { useState } from "react";

import {
	PROFILE_COLUMN_OPTIONS,
	type ProfileColumnId,
	type ProfileListDensity,
} from "@/features/profiles/hooks/use-profile-list-preferences";

interface ColumnSettingsProps {
	columns: ProfileColumnId[];
	density: ProfileListDensity;
	onToggleColumn: (columnId: ProfileColumnId) => void;
	onDensityChange: (density: ProfileListDensity) => void;
}

export function ColumnSettings({
	columns,
	density,
	onToggleColumn,
	onDensityChange,
}: ColumnSettingsProps) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<Button
				size="sm"
				variant="outline"
				className="border-[#252a36] bg-transparent"
				onClick={() => setOpen((value) => !value)}
			>
				<Columns3 className="size-3.5" />
				Columns
			</Button>

			{open ? (
				<div className="absolute top-10 right-0 z-20 w-56 rounded-md border border-[#252a36] bg-[#141820] p-3 shadow-xl">
					<p className="mb-2 font-medium text-[#dfe3ea] text-xs">Visible columns</p>
					<div className="space-y-2">
						{PROFILE_COLUMN_OPTIONS.map((column) => (
							<label
								key={column.id}
								className="flex items-center gap-2 text-[#c5cdd8] text-sm"
							>
								<Checkbox
									checked={columns.includes(column.id)}
									onCheckedChange={() => onToggleColumn(column.id)}
								/>
								{column.label}
							</label>
						))}
					</div>

					<p className="mt-4 mb-2 font-medium text-[#dfe3ea] text-xs">Density</p>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant={density === "compact" ? "default" : "outline"}
							className={
								density === "compact"
									? "bg-sky-600 hover:bg-sky-500"
									: "border-[#252a36]"
							}
							onClick={() => onDensityChange("compact")}
						>
							Compact
						</Button>
						<Button
							size="sm"
							variant={density === "comfortable" ? "default" : "outline"}
							className={
								density === "comfortable"
									? "bg-sky-600 hover:bg-sky-500"
									: "border-[#252a36]"
							}
							onClick={() => onDensityChange("comfortable")}
						>
							Comfortable
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
