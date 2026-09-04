import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import { Checkbox } from "@ProfileDock/ui/components/checkbox";
import { Input } from "@ProfileDock/ui/components/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { notion } from "@/app/design/system";
import { PageShell, PageTab, PageTabs, PageTitle } from "@/app/layout/page-shell";
import { useGroups } from "@/features/groups/api/queries";
import { useCreateProfileFull } from "@/features/profiles/api/mutations";
import { useProxies } from "@/features/proxies/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { FormField } from "@/features/shared/form-field";
import { FormSelect } from "@/features/shared/form-select";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { CreateProfileFullInput } from "@/types/profile";
import type { ProxyProtocol } from "@/types/proxy";

type TabId = "general" | "proxy" | "platform" | "browser" | "advanced";

const DRAFT_STORAGE_KEY = "profiledock.new-profile-draft";
const NONE_VALUE = "__none__";

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

	const groupOptions = useMemo(
		() => [
			{ value: NONE_VALUE, label: "Ungrouped" },
			...(groupsQuery.data ?? []).map((group) => ({
				value: group.id,
				label: group.name,
			})),
		],
		[groupsQuery.data],
	);

	const proxyModeOptions = [
		{ value: "none", label: "No proxy" },
		{ value: "saved", label: "Saved proxy" },
		{ value: "custom", label: "Custom proxy" },
	];

	const protocolOptions = [
		{ value: "socks5", label: "SOCKS5" },
		{ value: "http", label: "HTTP" },
		{ value: "https", label: "HTTPS" },
	];

	const windowModeOptions = [
		{ value: "normal", label: "Normal" },
		{ value: "maximized", label: "Maximized" },
	];

	const savedProxyOptions = useMemo(
		() => [
			{ value: NONE_VALUE, label: "Select proxy" },
			...(proxiesQuery.data ?? []).map((proxy) => ({
				value: proxy.id,
				label: proxy.name,
			})),
		],
		[proxiesQuery.data],
	);

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

	const removeTag = (tag: string) => {
		setForm((current) => ({
			...current,
			tags: (current.tags ?? []).filter((item) => item !== tag),
		}));
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

	const selectedGroupName =
		groupsQuery.data?.find((g) => g.id === form.groupId)?.name ?? "Ungrouped";

	const proxySummary =
		form.proxyMode === "saved"
			? (proxiesQuery.data?.find((p) => p.id === form.proxyId)?.name ??
				"Not selected")
			: form.proxyMode === "custom"
				? (form.customProxy?.name || "Custom proxy")
				: "None";

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<PageTitle
				title="New browser profile"
				description="Configure profile metadata, proxy, and CloakBrowser settings."
				actions={
					<div className="flex gap-2">
						{draftRestored ? (
							<Button variant="ghost" onClick={clearDraft}>
								Clear draft
							</Button>
						) : null}
						<Button variant="outline" render={<Link to="/profiles" />}>
							Cancel
						</Button>
						<Button
							disabled={!desktop || !form.name.trim() || createProfile.isPending}
							onClick={handleCreate}
						>
							Create profile
						</Button>
					</div>
				}
			/>

			<div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
				<div className="space-y-8">
					<PageTabs>
						{tabs.map((item) => (
							<PageTab
								key={item.id}
								active={tab === item.id}
								onClick={() => setTab(item.id)}
							>
								{item.label}
							</PageTab>
						))}
					</PageTabs>

					<div className="max-w-2xl space-y-6">
						{tab === "general" ? (
							<>
								<FormField label="Profile name">
									<Input
										className={notion.input}
										placeholder="e.g. Marketing — US"
										value={form.name}
										onChange={(e) =>
											setForm((c) => ({ ...c, name: e.target.value }))
										}
									/>
								</FormField>
								<FormField label="Group">
									<FormSelect
										value={form.groupId ?? NONE_VALUE}
										onValueChange={(value) =>
											setForm((c) => ({
												...c,
												groupId: value === NONE_VALUE ? undefined : value,
											}))
										}
										options={groupOptions}
										placeholder="Select group"
									/>
								</FormField>
								<FormField
									label="Tags"
									hint="Press Enter or click Add to create a tag."
								>
									<div className="flex gap-2">
										<Input
											className={notion.input}
											placeholder="Add a tag"
											value={tagInput}
											onChange={(e) => setTagInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													addTag();
												}
											}}
										/>
										<Button variant="outline" onClick={addTag}>
											Add
										</Button>
									</div>
									{(form.tags ?? []).length > 0 ? (
										<div className="flex flex-wrap gap-1.5 pt-2">
											{(form.tags ?? []).map((tag) => (
												<Badge
													key={tag}
													variant="neutral"
													className="gap-1 pr-1.5"
												>
													{tag}
													<button
														type="button"
														className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
														onClick={() => removeTag(tag)}
														aria-label={`Remove ${tag}`}
													>
														<X className="size-3" />
													</button>
												</Badge>
											))}
										</div>
									) : null}
								</FormField>
								<FormField label="Remark">
									<Input
										className={notion.input}
										placeholder="Optional short note"
										value={form.remark ?? ""}
										onChange={(e) =>
											setForm((c) => ({ ...c, remark: e.target.value }))
										}
									/>
								</FormField>
							</>
						) : null}

						{tab === "proxy" ? (
							<>
								<FormField label="Proxy mode">
									<FormSelect
										value={form.proxyMode ?? "none"}
										onValueChange={(value) =>
											setForm((c) => ({
												...c,
												proxyMode:
													value as CreateProfileFullInput["proxyMode"],
											}))
										}
										options={proxyModeOptions}
									/>
								</FormField>
								{form.proxyMode === "saved" ? (
									<FormField label="Saved proxy">
										<FormSelect
											value={form.proxyId ?? NONE_VALUE}
											onValueChange={(value) =>
												setForm((c) => ({
													...c,
													proxyId: value === NONE_VALUE ? undefined : value,
												}))
											}
											options={savedProxyOptions}
											placeholder="Select proxy"
										/>
									</FormField>
								) : null}
								{form.proxyMode === "custom" ? (
									<div className="space-y-6">
										<FormField label="Proxy name">
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
										</FormField>
										<FormField label="Protocol">
											<FormSelect
												value={form.customProxy?.protocol ?? "socks5"}
												onValueChange={(value) =>
													setForm((c) => ({
														...c,
														customProxy: {
															...(c.customProxy ?? {
																name: "",
																protocol: "socks5",
																host: "",
																port: 1080,
															}),
															protocol: value as ProxyProtocol,
														},
													}))
												}
												options={protocolOptions}
											/>
										</FormField>
										<div className="grid gap-4 sm:grid-cols-2">
											<FormField label="Host">
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
											</FormField>
											<FormField label="Port">
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
											</FormField>
										</div>
										<FormField label="Username">
											<Input
												className={notion.input}
												placeholder="Optional"
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
										</FormField>
										<FormField label="Password">
											<Input
												type="password"
												className={notion.input}
												placeholder="Optional"
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
										</FormField>
									</div>
								) : null}
							</>
						) : null}

						{tab === "platform" ? (
							<FormField
								label="Platform label"
								hint="Used for filtering and organization in the profile list."
							>
								<Input
									className={notion.input}
									placeholder="General, QA, Web Testing..."
									value={form.platformLabel ?? ""}
									onChange={(e) =>
										setForm((c) => ({ ...c, platformLabel: e.target.value }))
									}
								/>
							</FormField>
						) : null}

						{tab === "browser" ? (
							<>
								<FormField label="Startup URLs">
									<div className="flex gap-2">
										<Input
											className={notion.input}
											placeholder="https://example.com"
											value={startupUrl}
											onChange={(e) => setStartupUrl(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
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
												}
											}}
										/>
										<Button
											variant="outline"
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
									{(form.browser?.startupUrls ?? []).length > 0 ? (
										<ul className="mt-2 space-y-1">
											{(form.browser?.startupUrls ?? []).map((url) => (
												<li
													key={url}
													className="truncate text-muted-foreground text-xs"
												>
													{url}
												</li>
											))}
										</ul>
									) : null}
								</FormField>
								<FormField label="Window mode">
									<FormSelect
										value={form.browser?.windowMode ?? "normal"}
										onValueChange={(value) =>
											setForm((c) => ({
												...c,
												browser: {
													...c.browser,
													windowMode: value as "normal" | "maximized",
												},
											}))
										}
										options={windowModeOptions}
									/>
								</FormField>
								<label className="flex cursor-pointer items-center gap-2.5 py-1">
									<Checkbox
										checked={form.browser?.restoreSession ?? true}
										onCheckedChange={(checked) =>
											setForm((c) => ({
												...c,
												browser: {
													...c.browser,
													restoreSession: checked === true,
												},
											}))
										}
									/>
									<span className="text-foreground text-sm">
										Restore previous session
									</span>
								</label>
							</>
						) : null}

						{tab === "advanced" ? (
							<FormField label="Notes">
								<textarea
									className={notion.textarea}
									placeholder="Internal notes about this profile..."
									value={form.notes ?? ""}
									onChange={(e) =>
										setForm((c) => ({ ...c, notes: e.target.value }))
									}
								/>
							</FormField>
						) : null}
					</div>
				</div>

				<aside className="space-y-5 xl:pt-1">
					<div>
						<h2 className="font-medium text-foreground text-sm">Overview</h2>
						<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
							Live summary of your configuration.
						</p>
					</div>
					<dl className="space-y-0">
						<OverviewRow label="Name" value={form.name || "—"} />
						<OverviewRow label="Group" value={selectedGroupName} />
						<OverviewRow
							label="Tags"
							value={
								(form.tags ?? []).length > 0 ? (
									<div className="flex flex-wrap justify-end gap-1">
										{(form.tags ?? []).map((tag) => (
											<Badge key={tag} variant="neutral">
												{tag}
											</Badge>
										))}
									</div>
								) : (
									"—"
								)
							}
						/>
						<OverviewRow label="Browser" value="CloakBrowser" />
						<OverviewRow label="Proxy" value={proxySummary} />
						<OverviewRow
							label="Startup URLs"
							value={String(form.browser?.startupUrls?.length ?? 0)}
						/>
						<OverviewRow
							label="Restore session"
							value={form.browser?.restoreSession ? "Enabled" : "Disabled"}
						/>
					</dl>
				</aside>
			</div>
		</PageShell>
	);
}

function OverviewRow({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4 border-border/50 border-b py-3 last:border-0">
			<dt className="shrink-0 text-muted-foreground text-xs">{label}</dt>
			<dd className="min-w-0 text-right text-foreground text-xs">{value}</dd>
		</div>
	);
}
