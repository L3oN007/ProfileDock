import { Button } from "@ProfileDock/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ProfileDock/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ProfileDock/ui/components/select";

import {
	useAssignProxy,
	useUnassignProxy,
} from "@/features/proxies/api/mutations";
import { useProxies } from "@/features/proxies/api/queries";
import { ProxyHealthBadge } from "@/features/proxies/components/proxy-health-badge";
import type { ProfileProxyAssignment } from "@/types/proxy";

interface AssignProxyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	profileId: string;
	assignment: ProfileProxyAssignment | undefined;
	isRunning: boolean;
}

export function AssignProxyDialog({
	open,
	onOpenChange,
	profileId,
	assignment,
	isRunning,
}: AssignProxyDialogProps) {
	const proxiesQuery = useProxies();
	const assignProxy = useAssignProxy();
	const unassignProxy = useUnassignProxy();

	const proxies = (proxiesQuery.data ?? []).filter(
		(proxy) => !proxy.isArchived,
	);

	const handleAssign = async (proxyId: string) => {
		if (proxyId === "none") {
			if (assignment?.proxy) {
				await unassignProxy.mutateAsync(profileId);
			}
			onOpenChange(false);
			return;
		}
		await assignProxy.mutateAsync({ profileId, proxyId });
		onOpenChange(false);
	};

	const handleUnassign = async () => {
		await unassignProxy.mutateAsync(profileId);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-[#252a36] bg-[#161b26] sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change Proxy</DialogTitle>
				</DialogHeader>

				{isRunning ? (
					<p className="text-amber-400 text-sm">
						Stop the browser before changing its proxy.
					</p>
				) : (
					<div className="space-y-3 py-2">
						<Select
							value={assignment?.proxy?.id ?? "none"}
							onValueChange={(value) => {
								if (value) handleAssign(value);
							}}
						>
							<SelectTrigger className="border-[#252a36] bg-[#0f1117]">
								<SelectValue placeholder="Select proxy" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No proxy</SelectItem>
								{proxies.map((proxy) => (
									<SelectItem key={proxy.id} value={proxy.id}>
										{proxy.name} ({proxy.host}:{proxy.port})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<DialogFooter>
					{assignment?.proxy && !isRunning ? (
						<Button
							variant="outline"
							className="border-[#252a36]"
							onClick={handleUnassign}
						>
							Unassign
						</Button>
					) : null}
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface ProfileNetworkCardProps {
	profileId: string;
	isRunning: boolean;
	assignment: ProfileProxyAssignment | undefined;
	isLoading: boolean;
	onChangeProxy: () => void;
}

export function ProfileNetworkCard({
	assignment,
	isLoading,
	isRunning,
	onChangeProxy,
}: ProfileNetworkCardProps) {
	if (isLoading) {
		return (
			<div className="rounded-lg border border-[#252a36] bg-[#161b26] p-4">
				<p className="text-[#8b93a1] text-sm">Loading network settings...</p>
			</div>
		);
	}

	const proxy = assignment?.proxy;

	return (
		<div className="rounded-lg border border-[#252a36] bg-[#161b26] p-4">
			<div className="flex items-center justify-between gap-3">
				<h3 className="font-medium text-[#eef1f6]">Network</h3>
				<Button
					size="sm"
					variant="outline"
					className="border-[#252a36]"
					disabled={isRunning}
					onClick={onChangeProxy}
				>
					{proxy ? "Change Proxy" : "Assign Proxy"}
				</Button>
			</div>

			{proxy ? (
				<div className="mt-3 space-y-2 text-sm">
					<p className="font-medium text-[#dfe3ea]">{proxy.name}</p>
					<p className="text-[#8b93a1] text-xs uppercase">{proxy.protocol}</p>
					<p className="font-mono text-[#c5cdd8]">
						{proxy.host}:{proxy.port}
					</p>
					<ProxyHealthBadge status={proxy.healthStatus} />
				</div>
			) : (
				<p className="mt-3 text-[#8b93a1] text-sm">No proxy assigned</p>
			)}
		</div>
	);
}
