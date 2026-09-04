import { Badge } from "@ProfileDock/ui/components/badge";
import { cn } from "@ProfileDock/ui/lib/utils";
import { Apple, Laptop, Monitor } from "lucide-react";

import { FormField } from "@/features/shared/form-field";
import { FormSelect } from "@/features/shared/form-select";
import {
	DEFAULT_OS_FAMILY,
	DEFAULT_OS_VERSION,
	OS_OPTIONS,
	type OsFamily,
	previewUserAgent,
} from "@/features/profiles/lib/platform-config";

const OS_ICONS: Record<OsFamily, typeof Monitor> = {
	windows: Monitor,
	macos: Apple,
	linux: Laptop,
};

interface ProfileOsPickerProps {
	osFamily: OsFamily;
	osVersion: string;
	onOsFamilyChange: (value: OsFamily) => void;
	onOsVersionChange: (value: string) => void;
}

export function ProfileOsPicker({
	osFamily,
	osVersion,
	onOsFamilyChange,
	onOsVersionChange,
}: ProfileOsPickerProps) {
	const selectedOption = OS_OPTIONS.find((item) => item.id === osFamily);
	const versionOptions =
		selectedOption?.versions.map((version) => ({
			value: version.value,
			label: version.label,
		})) ?? [];

	return (
		<div className="space-y-6">
			<FormField
				label="Operating system"
				hint="Used for organization and overview preview. CloakBrowser manages the actual browser identity."
			>
				<div className="flex flex-wrap gap-2">
					{OS_OPTIONS.map((option) => {
						const Icon = OS_ICONS[option.id];
						const active = option.id === osFamily;
						return (
							<button
								key={option.id}
								type="button"
								className={cn(
									"flex min-w-[108px] flex-col items-center gap-2 rounded-lg px-4 py-3 transition-colors",
									active
										? "bg-primary/10 text-primary ring-1 ring-primary/30"
										: "bg-surface text-muted-foreground hover:bg-surface-inset hover:text-foreground",
								)}
								onClick={() => {
									onOsFamilyChange(option.id);
									onOsVersionChange(option.versions[0]?.value ?? DEFAULT_OS_VERSION);
								}}
							>
								<Icon className="size-5" />
								<span className="font-medium text-sm">{option.label}</span>
							</button>
						);
					})}
				</div>
			</FormField>

			<FormField label="OS version">
				<FormSelect
					value={osVersion}
					onValueChange={onOsVersionChange}
					options={versionOptions}
				/>
			</FormField>

			<div className="space-y-2 rounded-lg border border-border/50 bg-surface px-4 py-3">
				<div className="flex items-center justify-between gap-2">
					<p className="font-medium text-foreground text-sm">User-Agent preview</p>
					<Badge variant="neutral">Read-only</Badge>
				</div>
				<p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
					{previewUserAgent(osFamily, osVersion)}
				</p>
				<p className="text-muted-foreground text-xs">
					CloakBrowser applies its own identity at launch. This preview reflects
					your selected OS for planning only.
				</p>
			</div>
		</div>
	);
}

export function defaultOsSelection() {
	return {
		osFamily: DEFAULT_OS_FAMILY,
		osVersion: DEFAULT_OS_VERSION,
	};
}
