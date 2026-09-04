import { Button } from "@ProfileDock/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

import { pickOpenJsonFile, pickSaveJsonFile } from "@/lib/tauri/dialog";
import { profileApi } from "@/lib/tauri/profile";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { AppError } from "@/types/app";

interface ProfileCookiesCardProps {
	profileId: string;
}

export function ProfileCookiesCard({ profileId }: ProfileCookiesCardProps) {
	const [isWorking, setIsWorking] = useState(false);
	const desktop = isDesktopRuntime();

	const handleExport = async () => {
		setIsWorking(true);
		try {
			const destinationPath = await pickSaveJsonFile(
				"Export cookies",
				`profile-${profileId}-cookies.json`,
			);
			if (!destinationPath) return;

			const result = await profileApi.exportCookies(profileId, destinationPath);
			toast.success(`Exported ${result.count} cookies`);
		} catch (error) {
			toast.error((error as AppError).message);
		} finally {
			setIsWorking(false);
		}
	};

	const handleImport = async () => {
		setIsWorking(true);
		try {
			const sourcePath = await pickOpenJsonFile("Import cookies");
			if (!sourcePath || Array.isArray(sourcePath)) return;

			const result = await profileApi.importCookies(profileId, sourcePath);
			toast.success(`Imported ${result.count} cookies`);
		} catch (error) {
			toast.error((error as AppError).message);
		} finally {
			setIsWorking(false);
		}
	};

	return (
		<div className="space-y-3 rounded-md border border-[#252a36] p-3">
			<p className="font-medium text-[#dfe3ea] text-sm">Cookies</p>
			<p className="text-[#8b93a1] text-xs">
				Import/export portable JSON cookie bundles. Files are validated before being
				stored in the profile directory.
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36]"
					disabled={!desktop || isWorking}
					onClick={handleExport}
				>
					Export cookies
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36]"
					disabled={!desktop || isWorking}
					onClick={handleImport}
				>
					Import cookies
				</Button>
			</div>
		</div>
	);
}
