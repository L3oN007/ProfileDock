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
import { useEffect, useState } from "react";

import { PageShell, PageTitle, panelClassName } from "@/app/layout/page-shell";
import { notion } from "@/app/design/system";
import { useGroups } from "@/features/groups/api/queries";
import { useCreateProfileFull } from "@/features/profiles/api/mutations";
import { useProxies } from "@/features/proxies/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { CreateProfileFullInput } from "@/types/profile";
import type { ProxyProtocol } from "@/types/proxy";

type TabId = "general" | "proxy" | "platform" | "browser" | "advanced";

const DRAFT_STORAGE_KEY = "profiledock.new-profile-draft";

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
	const [draftRestored, setDraftRestored] = useState(false);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as CreateProfileFullInput;
			if (parsed && typeof parsed === "object") {
				setForm({ ...defaultForm, ...parsed });
				setDraftRestored(true);
			}
		} catch {
			// ignore invalid draft
		}
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
		}, 400);
		return () => window.clearTimeout(timer);
	}, [form]);

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
		localStorage.removeItem(DRAFT_STORAGE_KEY);
		navigate({ to: "/profiles/$profileId", params: { profileId: profile.id } });
	};

	const clearDraft = () => {
		setForm(defaultForm);
		setTagInput("");
		setStartupUrl("");
		localStorage.removeItem(DRAFT_STORAGE_KEY);
		setDraftRestored(false);
	};

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<PageTitle
				title="New browser profile"
				description="Configure profile metadata, proxy, and CloakBrowser settings."
				actions={
					<div className="flex gap-2">
						{draftRestored ? (
							<Button variant="outline" onClick={clearDraft}>
								Clear draft
							</Button>
						) : null}
						<Link
							to="/profiles"
							className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent"
						>
							Cancel
						</Link>
						<Button
							disabled={!desktop || !form.name.trim() || createProfile.isPending}
							onClick={handleCreate}
						>
							Create profile
						</Button>
					</div>
				}
			/>

			<div className="grid gap-6 xl:grid-cols-[1fr_320px]">
				<Card className={panelClassName}>
					<CardHeader className="border-border border-b px-0 pb-0">
						<div className="flex flex-wrap gap-1 px-4">
							{tabs.map((item) => (
								<button
									key={item.id}
									type="button"
									className={`border-b-2 px-3 py-2.5 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
										tab === item.id
											? "border-foreground font-medium text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
									onClick={() => setTab(item.id)}
								>
									{item.label}
								</button>
							))}
						</div>
					</CardHeader>
					<CardContent className="space-y-4 pt-6">
						{tab === "general" ? (
							<>
								<Field label="Profile name">
									<Input
										className={notion.input}
										value={form.name}
										onChange={(e) =>
											setForm((c) => ({ ...c, name: e.target.value }))
										}
									/>
								</Field>
								<Field label="Group">
									<select
										className={`h-9 w-full ${notion.select}`}
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
											className={notion.input}
											value={tagInput}
											onChange={(e) => setTagInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													addTag();
												}
											}}
										/>
										<Button variant="outline" className="border-border" onClick={addTag}>
											Add
										</Button>
									</div>
									<div className="mt-2 flex flex-wrap gap-2">
										{(form.tags ?? []).map((tag) => (
											<span
												key={tag}
												className="rounded-full bg-accent px-2 py-1 text-foreground text-xs"
											>
												{tag}
											</span>
										))}
									</div>
								</Field>
								<Field label="Remark">
									<Input
										className={notion.input}
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
										className={`h-9 w-full ${notion.select}`}
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
										<option value="custom">Custom Proxy</option>
									</select>
								</Field>
								{form.proxyMode === "saved" ? (
									<Field label="Saved proxy">
										<select
											className={`h-9 w-full ${notion.select}`}
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
								{form.proxyMode === "custom" ? (
									<>
										<Field label="Proxy name">
											<Input
												className={notion.input}
												value={form.customProxy?.name ?? ""}
												onChange={(e) =>
													setForm((c) => ({
														...c,
														customProxy: {
															...(c.customProxy ?? {
																name: "",
																protocol: "socks5",
																host: "",
																port: 1080,
															}),
															name: e.target.value,
														},
													}))
												}
											/>
										</Field>
										<Field label="Protocol">
											<select
												className={`h-9 w-full ${notion.select}`}
												value={form.customProxy?.protocol ?? "socks5"}
												onChange={(e) =>
													setForm((c) => ({
														...c,
														customProxy: {
															...(c.customProxy ?? {
																name: "",
																protocol: "socks5",
																host: "",
																port: 1080,
															}),
															protocol: e.target.value as ProxyProtocol,
														},
													}))
												}
											>
												<option value="socks5">SOCKS5</option>
												<option value="http">HTTP</option>
												<option value="https">HTTPS</option>
											</select>
										</Field>
										<div className="grid gap-3 sm:grid-cols-2">
											<Field label="Host">
												<Input
													className={notion.input}
													value={form.customProxy?.host ?? ""}
													onChange={(e) =>
														setForm((c) => ({
															...c,
															customProxy: {
																...(c.customProxy ?? {
																	name: "",
																	protocol: "socks5",
																	host: "",
																	port: 1080,
																}),
																host: e.target.value,
															},
														}))
													}
												/>
											</Field>
											<Field label="Port">
												<Input
													type="number"
													className={notion.input}
													value={form.customProxy?.port ?? 1080}
													onChange={(e) =>
														setForm((c) => ({
															...c,
															customProxy: {
																...(c.customProxy ?? {
																	name: "",
																	protocol: "socks5",
																	host: "",
																	port: 1080,
																}),
																port: Number(e.target.value) || 0,
															},
														}))
													}
												/>
											</Field>
										</div>
										<Field label="Username (optional)">
											<Input
												className={notion.input}
												value={form.customProxy?.username ?? ""}
												onChange={(e) =>
													setForm((c) => ({
														...c,
														customProxy: {
															...(c.customProxy ?? {
																name: "",
																protocol: "socks5",
																host: "",
																port: 1080,
															}),
															username: e.target.value || undefined,
														},
													}))
												}
											/>
										</Field>
										<Field label="Password (optional)">
											<Input
												type="password"
												className={notion.input}
												value={form.customProxy?.password ?? ""}
												onChange={(e) =>
													setForm((c) => ({
														...c,
														customProxy: {
															...(c.customProxy ?? {
																name: "",
																protocol: "socks5",
																host: "",
																port: 1080,
															}),
															password: e.target.value || undefined,
														},
													}))
												}
											/>
										</Field>
									</>
								) : null}
							</>
						) : null}

						{tab === "platform" ? (
							<Field label="Platform label">
								<Input
									className={notion.input}
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
											className={notion.input}
											placeholder="https://example.com"
											value={startupUrl}
											onChange={(e) => setStartupUrl(e.target.value)}
										/>
										<Button
											variant="outline"
											className="border-border"
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
										className={`h-9 w-full ${notion.select}`}
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
									className={notion.textarea}
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
									: form.proxyMode === "custom"
										? (form.customProxy?.name || "Custom proxy")
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
			<Label className="text-muted-foreground">{label}</Label>
			{children}
		</div>
	);
}

function OverviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-3 border-border border-b pb-2 last:border-0">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right text-foreground">{value}</span>
		</div>
	);
}
