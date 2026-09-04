import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";

import { profileApi } from "@/lib/tauri/profile";
import type { AppError } from "@/types/app";

interface ProfileCookiesCardProps {
	profileId: string;
}

export function ProfileCookiesCard({ profileId }: ProfileCookiesCardProps) {
	const [exportPath, setExportPath] = useState("");
	const [importPath, setImportPath] = useState("");
	const [isWorking, setIsWorking] = useState(false);

	const handleExport = async () => {
		if (!exportPath.trim()) return;
		setIsWorking(true);
		try {
			const result = await profileApi.exportCookies(profileId, exportPath.trim());
			toast.success(`Exported ${result.count} cookies`);
		} catch (error) {
			toast.error((error as AppError).message);
		} finally {
			setIsWorking(false);
		}
	};

	const handleImport = async () => {
		if (!importPath.trim()) return;
		setIsWorking(true);
		try {
			const result = await profileApi.importCookies(profileId, importPath.trim());
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
			<div className="space-y-2">
				<Input
					className="border-[#252a36] bg-[#0f1117]"
					placeholder="Export path e.g. /home/user/cookies.json"
					value={exportPath}
					onChange={(e) => setExportPath(e.target.value)}
				/>
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36]"
					disabled={isWorking || !exportPath.trim()}
					onClick={handleExport}
				>
					Export cookies
				</Button>
			</div>
			<div className="space-y-2">
				<Input
					className="border-[#252a36] bg-[#0f1117]"
					placeholder="Import path e.g. /home/user/cookies.json"
					value={importPath}
					onChange={(e) => setImportPath(e.target.value)}
				/>
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36]"
					disabled={isWorking || !importPath.trim()}
					onClick={handleImport}
				>
					Import cookies
				</Button>
			</div>
		</div>
	);
}
