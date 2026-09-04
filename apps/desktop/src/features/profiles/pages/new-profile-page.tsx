import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { Label } from "@ProfileDock/ui/components/label";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { useGroups } from "@/features/groups/api/queries";
import { useCreateProfileFull } from "@/features/profiles/api/mutations";
import { useProxies } from "@/features/proxies/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { CreateProfileFullInput } from "@/types/profile";

type TabId = "general" | "proxy" | "platform" | "browser" | "advanced";

const tabs: { id: TabId; label: string }[] = [
	{ id: "general", label: "General" },
	{ id: "proxy", label: "Proxy" },
	{ id: "platform", label: "Platform" },
	{ id: "browser", label: "Browser" },
	{ id: "advanced", label: "Advanced" },
];

const defaultForm: CreateProfileFullInput = {
	name: "",
	tags: [],
	proxyMode: "none",
	browser: {
		startupUrls: [],
		downloadMode: "profile",
		windowMode: "normal",
		restoreSession: true,
	},
};

export function NewProfilePage() {
	const desktop = isDesktopRuntime();
	const navigate = useNavigate();
	const createProfile = useCreateProfileFull();
	const groupsQuery = useGroups();
	const proxiesQuery = useProxies();
	const [tab, setTab] = useState<TabId>("general");
	const [form, setForm] = useState<CreateProfileFullInput>(defaultForm);
	const [tagInput, setTagInput] = useState("");
	const [startupUrl, setStartupUrl] = useState("");

	const addTag = () => {
		const value = tagInput.trim();
		if (!value) return;
		setForm((current) => ({
			...current,
			tags: [...new Set([...(current.tags ?? []), value])],
		}));
		setTagInput("");
	};

	const handleCreate = async () => {
		const profile = await createProfile.mutateAsync(form);
		navigate({ to: "/profiles/$profileId", params: { profileId: profile.id } });
	};

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<div className="mb-4 flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-[#eef1f6] text-xl">New Browser Profile</h1>
					<p className="text-[#8b93a1] text-sm">
						Configure profile metadata, proxy, and CloakBrowser settings.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/profiles"
						className="inline-flex h-9 items-center justify-center rounded-md border border-[#252a36] px-4 text-sm"
					>
						Cancel
					</Link>
					<Button
						className="bg-sky-600 hover:bg-sky-500"
						disabled={!desktop || !form.name.trim() || createProfile.isPending}
						onClick={handleCreate}
					>
						Create Profile
					</Button>
				</div>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1fr_320px]">
				<Card className={panelClassName}>
					<CardHeader className="border-[#252a36] border-b pb-3">
						<div className="flex flex-wrap gap-2">
							{tabs.map((item) => (
								<Button
									key={item.id}
									size="sm"
									variant={tab === item.id ? "default" : "outline"}
									className={
										tab === item.id
											? "bg-sky-600 hover:bg-sky-500"
											: "border-[#252a36]"
									}
									onClick={() => setTab(item.id)}
								>
									{item.label}
								</Button>
							))}
						</div>
					</CardHeader>
					<CardContent className="space-y-4 pt-4">
						{tab === "general" ? (
							<>
								<Field label="Profile name">
									<Input
										className="border-[#252a36] bg-[#0f1117]"
										value={form.name}
										onChange={(e) =>
											setForm((c) => ({ ...c, name: e.target.value }))
										}
									/>
								</Field>
								<Field label="Group">
									<select
										className="h-9 w-full rounded-md border border-[#252a36] bg-[#0f1117] px-3 text-sm"
										value={form.groupId ?? ""}
										onChange={(e) =>
											setForm((c) => ({
												...c,
												groupId: e.target.value || undefined,
											}))
										}
									>
										<option value="">Ungrouped</option>
										{(groupsQuery.data ?? []).map((group) => (
											<option key={group.id} value={group.id}>
												{group.name}
											</option>
										))}
									</select>
								</Field>
								<Field label="Tags">
									<div className="flex gap-2">
										<Input
											className="border-[#252a36] bg-[#0f1117]"
											value={tagInput}
											onChange={(e) => setTagInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													addTag();
												}
											}}
										/>
										<Button variant="outline" className="border-[#252a36]" onClick={addTag}>
											Add
										</Button>
									</div>
									<div className="mt-2 flex flex-wrap gap-2">
										{(form.tags ?? []).map((tag) => (
											<span
												key={tag}
												className="rounded-full bg-[#1e2230] px-2 py-1 text-[#dfe3ea] text-xs"
											>
												{tag}
											</span>
										))}
									</div>
								</Field>
								<Field label="Remark">
									<Input
										className="border-[#252a36] bg-[#0f1117]"
										value={form.remark ?? ""}
										onChange={(e) =>
											setForm((c) => ({ ...c, remark: e.target.value }))
										}
									/>
								</Field>
							</>
						) : null}

						{tab === "proxy" ? (
							<>
								<Field label="Proxy mode">
									<select
										className="h-9 w-full rounded-md border border-[#252a36] bg-[#0f1117] px-3 text-sm"
										value={form.proxyMode ?? "none"}
										onChange={(e) =>
											setForm((c) => ({
												...c,
												proxyMode: e.target.value as CreateProfileFullInput["proxyMode"],
											}))
										}
									>
										<option value="none">No Proxy</option>
										<option value="saved">Saved Proxy</option>
									</select>
								</Field>
								{form.proxyMode === "saved" ? (
									<Field label="Saved proxy">
										<select
											className="h-9 w-full rounded-md border border-[#252a36] bg-[#0f1117] px-3 text-sm"
											value={form.proxyId ?? ""}
											onChange={(e) =>
												setForm((c) => ({ ...c, proxyId: e.target.value }))
											}
										>
											<option value="">Select proxy</option>
											{(proxiesQuery.data ?? []).map((proxy) => (
												<option key={proxy.id} value={proxy.id}>
													{proxy.name}
												</option>
											))}
										</select>
									</Field>
								) : null}
							</>
						) : null}

						{tab === "platform" ? (
							<Field label="Platform label">
								<Input
									className="border-[#252a36] bg-[#0f1117]"
									placeholder="General, QA, Web Testing..."
									value={form.platformLabel ?? ""}
									onChange={(e) =>
										setForm((c) => ({ ...c, platformLabel: e.target.value }))
									}
								/>
							</Field>
						) : null}

						{tab === "browser" ? (
							<>
								<Field label="Startup URLs">
									<div className="flex gap-2">
										<Input
											className="border-[#252a36] bg-[#0f1117]"
											placeholder="https://example.com"
											value={startupUrl}
											onChange={(e) => setStartupUrl(e.target.value)}
										/>
										<Button
											variant="outline"
											className="border-[#252a36]"
											onClick={() => {
												const value = startupUrl.trim();
												if (!value) return;
												setForm((c) => ({
													...c,
													browser: {
														...c.browser,
														startupUrls: [
															...(c.browser?.startupUrls ?? []),
															value,
														],
													},
												}));
												setStartupUrl("");
											}}
										>
											Add
										</Button>
									</div>
								</Field>
								<Field label="Window mode">
									<select
										className="h-9 w-full rounded-md border border-[#252a36] bg-[#0f1117] px-3 text-sm"
										value={form.browser?.windowMode ?? "normal"}
										onChange={(e) =>
											setForm((c) => ({
												...c,
												browser: {
													...c.browser,
													windowMode: e.target.value as "normal" | "maximized",
												},
											}))
										}
									>
										<option value="normal">Normal</option>
										<option value="maximized">Maximized</option>
									</select>
								</Field>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={form.browser?.restoreSession ?? true}
										onChange={(e) =>
											setForm((c) => ({
												...c,
												browser: {
													...c.browser,
													restoreSession: e.target.checked,
												},
											}))
										}
									/>
									Restore previous session
								</label>
							</>
						) : null}

						{tab === "advanced" ? (
							<Field label="Notes">
								<textarea
									className="min-h-28 w-full rounded-md border border-[#252a36] bg-[#0f1117] p-3 text-sm"
									value={form.notes ?? ""}
									onChange={(e) =>
										setForm((c) => ({ ...c, notes: e.target.value }))
									}
								/>
							</Field>
						) : null}
					</CardContent>
				</Card>

				<Card className={panelClassName}>
					<CardHeader>
						<CardTitle className="text-base">Overview</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<OverviewRow label="Name" value={form.name || "—"} />
						<OverviewRow
							label="Group"
							value={
								groupsQuery.data?.find((g) => g.id === form.groupId)?.name ??
								"Ungrouped"
							}
						/>
						<OverviewRow label="Tags" value={(form.tags ?? []).join(", ") || "—"} />
						<OverviewRow label="Browser" value="CloakBrowser" />
						<OverviewRow
							label="Proxy"
							value={
								form.proxyMode === "saved"
									? (proxiesQuery.data?.find((p) => p.id === form.proxyId)?.name ??
										"Not selected")
									: "None"
							}
						/>
						<OverviewRow
							label="Startup URLs"
							value={String(form.browser?.startupUrls?.length ?? 0)}
						/>
						<OverviewRow
							label="Restore session"
							value={form.browser?.restoreSession ? "Enabled" : "Disabled"}
						/>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-2">
			<Label className="text-[#8b93a1]">{label}</Label>
			{children}
		</div>
	);
}

function OverviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-3 border-[#252a36] border-b pb-2 last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<span className="text-right text-[#dfe3ea]">{value}</span>
		</div>
	);
}
