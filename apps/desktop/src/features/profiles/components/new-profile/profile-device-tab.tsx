import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { RefreshCw } from "lucide-react";

import { notion } from "@/app/design/system";
import { FormField } from "@/features/shared/form-field";
import { FormSelect } from "@/features/shared/form-select";
import { SegmentedControl } from "@/features/shared/segmented-control";
import type {
	CreateProfileDeviceInput,
	DeviceConfigurationMode,
	DevicePlatform,
	EnvironmentMode,
	HardwarePreset,
	WebRtcMode,
} from "@/types/device";

const PLATFORM_OPTIONS = [
	{ value: "windows", label: "Windows" },
	{ value: "macos", label: "macOS" },
	{ value: "linux", label: "Linux" },
];

const ENV_OPTIONS = [
	{ value: "proxy", label: "Based on proxy" },
	{ value: "system", label: "System default" },
	{ value: "custom", label: "Custom" },
];

const WEBRTC_OPTIONS = [
	{ value: "proxy", label: "Based on proxy" },
	{ value: "real", label: "Real" },
	{ value: "disabled", label: "Disabled" },
];

interface ProfileDeviceTabProps {
	device: CreateProfileDeviceInput;
	presets: HardwarePreset[];
	previewSeed: number;
	onDeviceChange: (device: CreateProfileDeviceInput) => void;
	onRegenerateSeed: () => void;
}

export function ProfileDeviceTab({
	device,
	presets,
	previewSeed,
	onDeviceChange,
	onRegenerateSeed,
}: ProfileDeviceTabProps) {
	const isCustom = device.mode === "custom";
	const presetOptions = [
		{ value: "__auto__", label: "Automatic" },
		...presets.map((preset) => ({
			value: preset.id,
			label: preset.label,
		})),
	];

	const update = (patch: Partial<CreateProfileDeviceInput>) => {
		onDeviceChange({ ...device, ...patch });
	};

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="font-medium text-foreground text-sm">Configuration</h3>
					<p className="mt-1 text-muted-foreground text-xs">
						Automatic mode keeps a persistent fingerprint seed and lets
						CloakBrowser derive hardware signals.
					</p>
				</div>
				<SegmentedControl
					value={device.mode ?? "automatic"}
					onChange={(value) =>
						update({ mode: value as DeviceConfigurationMode })
					}
					options={[
						{ value: "automatic", label: "Automatic" },
						{ value: "custom", label: "Custom" },
					]}
				/>
			</section>

			<section className="space-y-4 rounded-lg border border-border/50 bg-surface p-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-medium text-foreground text-sm">
							Fingerprint seed
						</p>
						<p className="text-muted-foreground text-xs">
							Generated once when the profile is created and reused on every
							launch.
						</p>
					</div>
					<Badge variant="neutral">Preview</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Input
						className={notion.input}
						readOnly
						value={String(previewSeed)}
					/>
					<Button
						type="button"
						variant="outline"
						className="gap-1.5"
						onClick={onRegenerateSeed}
					>
						<RefreshCw className="size-3.5" />
						Regenerate
					</Button>
				</div>
			</section>

			<FormField label="Platform">
				<FormSelect
					value={device.platform ?? "windows"}
					onValueChange={(value) =>
						update({ platform: value as DevicePlatform })
					}
					options={PLATFORM_OPTIONS}
				/>
			</FormField>

			{isCustom ? (
				<section className="space-y-6 rounded-lg border border-border/50 bg-surface p-4">
					<div>
						<h3 className="font-medium text-foreground text-sm">Hardware</h3>
						<p className="mt-1 text-muted-foreground text-xs">
							Use curated presets for consistent testing configurations.
						</p>
					</div>
					<FormField label="Hardware preset">
						<FormSelect
							value={device.hardwarePresetId ?? "__auto__"}
							onValueChange={(value) =>
								update({
									hardwarePresetId: value === "__auto__" ? undefined : value,
								})
							}
							options={presetOptions}
						/>
					</FormField>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField label="CPU cores">
							<Input
								type="number"
								className={notion.input}
								min={1}
								max={64}
								value={device.hardwareConcurrency ?? ""}
								onChange={(e) =>
									update({
										hardwareConcurrency: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</FormField>
						<FormField label="Device memory (GB)">
							<Input
								type="number"
								className={notion.input}
								min={1}
								max={128}
								value={device.deviceMemoryGb ?? ""}
								onChange={(e) =>
									update({
										deviceMemoryGb: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</FormField>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField label="Screen width">
							<Input
								type="number"
								className={notion.input}
								value={device.screenWidth ?? ""}
								onChange={(e) =>
									update({
										screenWidth: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</FormField>
						<FormField label="Screen height">
							<Input
								type="number"
								className={notion.input}
								value={device.screenHeight ?? ""}
								onChange={(e) =>
									update({
										screenHeight: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</FormField>
					</div>
				</section>
			) : null}

			<section className="space-y-4">
				<div>
					<h3 className="font-medium text-foreground text-sm">Environment</h3>
					<p className="mt-1 text-muted-foreground text-xs">
						Timezone and locale proxy modes resolve from proxy configuration
						when available.
					</p>
				</div>
				<FormField label="Timezone">
					<FormSelect
						value={device.timezoneMode ?? "proxy"}
						onValueChange={(value) =>
							update({ timezoneMode: value as EnvironmentMode })
						}
						options={ENV_OPTIONS}
					/>
				</FormField>
				{device.timezoneMode === "custom" ? (
					<FormField label="Custom timezone">
						<Input
							className={notion.input}
							placeholder="Asia/Bangkok"
							value={device.timezone ?? ""}
							onChange={(e) => update({ timezone: e.target.value })}
						/>
					</FormField>
				) : null}
				<FormField label="Locale">
					<FormSelect
						value={device.localeMode ?? "proxy"}
						onValueChange={(value) =>
							update({ localeMode: value as EnvironmentMode })
						}
						options={ENV_OPTIONS}
					/>
				</FormField>
				{device.localeMode === "custom" ? (
					<FormField label="Custom locale">
						<Input
							className={notion.input}
							placeholder="en-US"
							value={device.locale ?? ""}
							onChange={(e) => update({ locale: e.target.value })}
						/>
					</FormField>
				) : null}
				<FormField label="WebRTC IP">
					<FormSelect
						value={device.webrtcMode ?? "proxy"}
						onValueChange={(value) =>
							update({ webrtcMode: value as WebRtcMode })
						}
						options={WEBRTC_OPTIONS}
					/>
				</FormField>
			</section>

			<div className="rounded-lg border border-border/50 bg-surface-inset px-4 py-3">
				<p className="font-medium text-foreground text-sm">
					Fingerprint engine
				</p>
				<p className="mt-1 text-muted-foreground text-xs">
					Canvas, WebGL, audio, and client rects remain Cloak-managed.
					ProfileDock does not expose per-signal noise toggles.
				</p>
			</div>
		</div>
	);
}

export function defaultDeviceInput(): CreateProfileDeviceInput {
	return {
		mode: "automatic",
		platform: "windows",
		timezoneMode: "proxy",
		localeMode: "proxy",
		webrtcMode: "proxy",
	};
}

export function previewFingerprintSeed() {
	return Math.floor(Math.random() * 90_000_000) + 10_000_000;
}
