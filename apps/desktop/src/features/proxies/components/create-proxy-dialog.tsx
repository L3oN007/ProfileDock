import { Button } from "@ProfileDock/ui/components/button";
import { Checkbox } from "@ProfileDock/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ProfileDock/ui/components/dialog";
import { Input } from "@ProfileDock/ui/components/input";
import { Label } from "@ProfileDock/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ProfileDock/ui/components/select";
import { useState } from "react";

import {
	useCreateProxy,
	useTestProxyInput,
} from "@/features/proxies/api/mutations";
import type { ProxyProtocol } from "@/types/proxy";

interface CreateProxyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateProxyDialog({
	open,
	onOpenChange,
}: CreateProxyDialogProps) {
	const [name, setName] = useState("");
	const [protocol, setProtocol] = useState<ProxyProtocol>("socks5");
	const [host, setHost] = useState("");
	const [port, setPort] = useState("1080");
	const [useAuth, setUseAuth] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const createProxy = useCreateProxy();
	const testProxy = useTestProxyInput();

	const reset = () => {
		setName("");
		setProtocol("socks5");
		setHost("");
		setPort("1080");
		setUseAuth(false);
		setUsername("");
		setPassword("");
	};

	const buildInput = () => ({
		name,
		protocol,
		host,
		port: Number.parseInt(port, 10) || 0,
		username: useAuth ? username : undefined,
		password: useAuth ? password : undefined,
	});

	const handleSave = async () => {
		await createProxy.mutateAsync(buildInput());
		reset();
		onOpenChange(false);
	};

	const handleTest = () => {
		testProxy.mutate(buildInput());
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-border bg-card sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Proxy</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<Field label="Name">
						<Input
							className="border-border bg-background"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="SG Proxy 01"
						/>
					</Field>

					<Field label="Protocol">
						<Select
							value={protocol}
							onValueChange={(value) => setProtocol(value as ProxyProtocol)}
						>
							<SelectTrigger className="border-border bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="http">HTTP</SelectItem>
								<SelectItem value="https">HTTPS</SelectItem>
								<SelectItem value="socks5">SOCKS5</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<div className="grid grid-cols-3 gap-3">
						<Field label="Host" className="col-span-2">
							<Input
								className="border-border bg-background"
								value={host}
								onChange={(e) => setHost(e.target.value)}
								placeholder="proxy.example.com"
							/>
						</Field>
						<Field label="Port">
							<Input
								className="border-border bg-background"
								value={port}
								onChange={(e) => setPort(e.target.value)}
								placeholder="1080"
							/>
						</Field>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							checked={useAuth}
							onCheckedChange={(checked) => setUseAuth(checked === true)}
						/>
						<Label className="text-sm">Username / Password</Label>
					</div>

					{useAuth ? (
						<div className="grid gap-3">
							<Field label="Username">
								<Input
									className="border-border bg-background"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
								/>
							</Field>
							<Field label="Password">
								<Input
									type="password"
									className="border-border bg-background"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</Field>
						</div>
					) : null}
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					<Button
						variant="outline"
						className="border-border"
						disabled={testProxy.isPending}
						onClick={handleTest}
					>
						Test Connection
					</Button>
					<div className="flex gap-2">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							className="bg-primary text-primary-foreground hover:bg-primary/90"
							disabled={createProxy.isPending || !name || !host}
							onClick={handleSave}
						>
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Field({
	label,
	children,
	className,
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={className}>
			<Label className="mb-1.5 block text-muted-foreground text-xs">{label}</Label>
			{children}
		</div>
	);
}
