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
				className="border-border bg-transparent"
				onClick={() => setOpen((value) => !value)}
			>
				<Columns3 className="size-3.5" />
				Columns
			</Button>

			{open ? (
				<div className="absolute top-10 right-0 z-20 w-56 rounded-md border border-border bg-card p-3 shadow-xl">
					<p className="mb-2 font-medium text-foreground text-xs">Visible columns</p>
					<div className="space-y-2">
						{PROFILE_COLUMN_OPTIONS.map((column) => (
							<label
								key={column.id}
								className="flex items-center gap-2 text-foreground text-sm"
							>
								<Checkbox
									checked={columns.includes(column.id)}
									onCheckedChange={() => onToggleColumn(column.id)}
								/>
								{column.label}
							</label>
						))}
					</div>

					<p className="mt-4 mb-2 font-medium text-foreground text-xs">Density</p>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant={density === "compact" ? "default" : "outline"}
							className={
								density === "compact"
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: "border-border"
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
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: "border-border"
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
