import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionBlock } from "@/app/layout/page-shell";
import {
	deviceKeys,
	useDevicePresets,
} from "@/features/profiles/api/device-queries";
import { ProfileDeviceTab } from "@/features/profiles/components/new-profile/profile-device-tab";
import { deviceApi } from "@/lib/tauri/device";
import type { CreateProfileDeviceInput } from "@/types/device";

interface ProfileDeviceCardProps {
	profileId: string;
	isRunning: boolean;
}

function toDraft(
	settings: Awaited<ReturnType<typeof deviceApi.get>>,
): CreateProfileDeviceInput {
	return {
		mode: settings.mode,
		platform: settings.platform ?? "windows",
		hardwarePresetId: settings.hardware_preset_id ?? undefined,
		hardwareConcurrency: settings.hardware_concurrency ?? undefined,
		deviceMemoryGb: settings.device_memory_gb ?? undefined,
		screenWidth: settings.screen_width ?? undefined,
		screenHeight: settings.screen_height ?? undefined,
		timezoneMode: settings.timezone_mode,
		timezone: settings.timezone ?? undefined,
		localeMode: settings.locale_mode,
		locale: settings.locale ?? undefined,
		webrtcMode: settings.webrtc_mode,
	};
}

export function ProfileDeviceCard({
	profileId,
	isRunning,
}: ProfileDeviceCardProps) {
	const queryClient = useQueryClient();
	const presetsQuery = useDevicePresets();
	const settingsQuery = useQuery({
		queryKey: deviceKeys.settings(profileId),
		queryFn: () => deviceApi.get(profileId),
	});
	const overviewQuery = useQuery({
		queryKey: deviceKeys.overview(profileId),
		queryFn: () => deviceApi.overview(profileId),
	});
	const [device, setDevice] = useState<CreateProfileDeviceInput | null>(null);

	useEffect(() => {
		if (settingsQuery.data) {
			setDevice(toDraft(settingsQuery.data));
		}
	}, [settingsQuery.data]);

	const updateMutation = useMutation({
		mutationFn: (input: CreateProfileDeviceInput) =>
			deviceApi.update(profileId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: deviceKeys.settings(profileId),
			});
			queryClient.invalidateQueries({
				queryKey: deviceKeys.overview(profileId),
			});
			toast.success("Device settings saved");
		},
	});

	const regenerateMutation = useMutation({
		mutationFn: () => deviceApi.regenerate(profileId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: deviceKeys.settings(profileId),
			});
			queryClient.invalidateQueries({
				queryKey: deviceKeys.overview(profileId),
			});
			toast.success("Fingerprint seed regenerated");
		},
	});

	if (settingsQuery.isLoading || !settingsQuery.data || !device) {
		return (
			<SectionBlock title="Device">Loading device settings...</SectionBlock>
		);
	}

	const previewSeed = settingsQuery.data.fingerprint_seed;

	return (
		<SectionBlock title="Device / Environment">
			{isRunning ? (
				<p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-600 text-sm dark:text-amber-300">
					Stop CloakBrowser before editing device settings.
				</p>
			) : null}

			{overviewQuery.data ? (
				<div className="flex flex-wrap gap-2">
					<Badge variant="neutral">
						Seed {overviewQuery.data.fingerprint_seed}
					</Badge>
					<Badge variant="info">{overviewQuery.data.platform}</Badge>
					<Badge variant="neutral">
						{overviewQuery.data.fingerprint_engine}
					</Badge>
				</div>
			) : null}

			<ProfileDeviceTab
				device={device}
				presets={presetsQuery.data ?? []}
				previewSeed={previewSeed}
				onDeviceChange={setDevice}
				onRegenerateSeed={() => {
					if (isRunning) return;
					regenerateMutation.mutate();
				}}
			/>

			<div className="flex justify-end gap-2">
				<Button
					variant="outline"
					className="gap-1.5"
					disabled={isRunning || regenerateMutation.isPending}
					onClick={() => regenerateMutation.mutate()}
				>
					<RefreshCw className="size-3.5" />
					Regenerate seed
				</Button>
				<Button
					disabled={isRunning || updateMutation.isPending}
					onClick={() => updateMutation.mutate(device)}
				>
					Save device settings
				</Button>
			</div>
		</SectionBlock>
	);
}
