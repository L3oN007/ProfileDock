import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import { Checkbox } from "@ProfileDock/ui/components/checkbox";
import { Input } from "@ProfileDock/ui/components/input";
import { Textarea } from "@ProfileDock/ui/components/textarea";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { notion } from "@/app/design/system";
import { RouterButton } from "@/components/router-button";
import {
	PageShell,
	PageTab,
	PageTabs,
	PageTitle,
} from "@/app/layout/page-shell";
import { useCloakCapabilities } from "@/features/cloak/api/queries";
import { useGroups } from "@/features/groups/api/queries";
import { useDevicePresets } from "@/features/profiles/api/device-queries";
import { useCreateProfileFull } from "@/features/profiles/api/mutations";
import {
	defaultDeviceInput,
	ProfileDeviceTab,
	previewFingerprintSeed,
} from "@/features/profiles/components/new-profile/profile-device-tab";
import {
	defaultOsSelection,
	ProfileOsPicker,
} from "@/features/profiles/components/new-profile/profile-os-picker";
import { ProfileOverviewSidebar } from "@/features/profiles/components/new-profile/profile-overview-sidebar";
import {
	buildPlatformLabel,
	type OsFamily,
	parsePlatformLabel,
} from "@/features/profiles/lib/platform-config";
import { useProxies } from "@/features/proxies/api/queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { FormField } from "@/features/shared/form-field";
import { FormSelect } from "@/features/shared/form-select";
import { SegmentedControl } from "@/features/shared/segmented-control";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { CreateProfileFullInput } from "@/types/profile";
import type { ProxyProtocol } from "@/types/proxy";

type TabId =
	| "general"
	| "proxy"
	| "platform"
	| "device"
	| "browser"
	| "advanced";

interface NewProfileDraft extends CreateProfileFullInput {
	osFamily?: OsFamily;
	osVersion?: string;
	cookiesDraft?: string;
}

const DRAFT_STORAGE_KEY = "profiledock.new-profile-draft";
const NONE_VALUE = "__none__";

const tabs: { id: TabId; label: string }[] = [
	{ id: "general", label: "General" },
	{ id: "proxy", label: "Proxy" },
	{ id: "platform", label: "Platform" },
	{ id: "device", label: "Device" },
	{ id: "browser", label: "Browser" },
	{ id: "advanced", label: "Advanced" },
];

const defaultOs = defaultOsSelection();

const defaultForm: NewProfileDraft = {
	name: "",
	tags: [],
	proxyMode: "none",
	osFamily: defaultOs.osFamily,
	osVersion: defaultOs.osVersion,
	browser: {
		startupUrls: [],
		downloadMode: "profile",
		windowMode: "normal",
		restoreSession: true,
	},
	device: defaultDeviceInput(),
};

export function NewProfilePage() {
	const desktop = isDesktopRuntime();
	const navigate = useNavigate();
	const createProfile = useCreateProfileFull();
	const groupsQuery = useGroups();
	const proxiesQuery = useProxies();
	const capabilitiesQuery = useCloakCapabilities();
	const presetsQuery = useDevicePresets();
	const [tab, setTab] = useState<TabId>("general");
	const [form, setForm] = useState<NewProfileDraft>(defaultForm);
	const [tagInput, setTagInput] = useState("");
	const [startupUrl, setStartupUrl] = useState("");
	const [draftRestored, setDraftRestored] = useState(false);
	const [previewSeed, setPreviewSeed] = useState(() =>
		previewFingerprintSeed(),
	);

	const osFamily = form.osFamily ?? defaultOs.osFamily;
	const osVersion = form.osVersion ?? defaultOs.osVersion;

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

	const protocolOptions = [
		{ value: "socks5", label: "SOCKS5" },
		{ value: "http", label: "HTTP" },
		{ value: "https", label: "HTTPS" },
	];

	const windowModeOptions = [
		{ value: "normal", label: "Normal" },
		{ value: "maximized", label: "Maximized" },
	];

	const downloadModeOptions = [
		{ value: "profile", label: "Profile downloads folder" },
		{ value: "custom", label: "Custom directory" },
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
			const parsed = JSON.parse(raw) as NewProfileDraft;
			if (parsed && typeof parsed === "object") {
				const restored = { ...defaultForm, ...parsed };
				if (!restored.osFamily || !restored.osVersion) {
					const fromLabel = parsePlatformLabel(restored.platformLabel);
					restored.osFamily = fromLabel.osFamily;
					restored.osVersion = fromLabel.osVersion;
				}
				setForm(restored);
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
		const {
			osFamily: draftOsFamily,
			osVersion: draftOsVersion,
			cookiesDraft: _cookiesDraft,
			...payload
		} = form;
		const profile = await createProfile.mutateAsync({
			...payload,
			platformLabel: buildPlatformLabel(
				draftOsFamily ?? defaultOs.osFamily,
				draftOsVersion ?? defaultOs.osVersion,
			),
		});
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
				? form.customProxy?.name || "Custom proxy"
				: "No proxy (local network)";

	const refreshFingerprint = () => {
		setPreviewSeed(previewFingerprintSeed());
	};

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<PageTitle
				title="New browser profile"
				description="Configure profile identity, proxy, platform, and CloakBrowser launch settings."
				actions={
					<div className="flex gap-2">
						{draftRestored ? (
							<Button variant="ghost" onClick={clearDraft}>
								Clear draft
							</Button>
						) : null}
						<RouterButton to="/profiles" variant="outline">
							Cancel
						</RouterButton>
						<Button
							disabled={
								!desktop || !form.name.trim() || createProfile.isPending
							}
							onClick={handleCreate}
						>
							Create profile
						</Button>
					</div>
				}
			/>

			<div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
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
										placeholder="Optional: profile name"
										maxLength={100}
										value={form.name}
										onChange={(e) =>
											setForm((c) => ({ ...c, name: e.target.value }))
										}
									/>
									<p className="text-muted-foreground text-xs">
										{form.name.length}/100
									</p>
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
										placeholder="Ungrouped"
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
								<FormField
									label="Cookies"
									hint="Paste cookie JSON here. You can also import from a file on the profile detail page after creation."
								>
									<Textarea
										className={notion.textarea}
										placeholder="JSON, Netscape, or Name-Value formats are supported."
										value={form.cookiesDraft ?? ""}
										onChange={(e) =>
											setForm((c) => ({ ...c, cookiesDraft: e.target.value }))
										}
									/>
								</FormField>
								<FormField label="Remark">
									<Textarea
										className={notion.textarea}
										placeholder="Optional note visible in the profile list"
										maxLength={2000}
										value={form.remark ?? ""}
										onChange={(e) =>
											setForm((c) => ({ ...c, remark: e.target.value }))
										}
									/>
									<p className="text-muted-foreground text-xs">
										{(form.remark ?? "").length}/2000
									</p>
								</FormField>
							</>
						) : null}

						{tab === "proxy" ? (
							<>
								<FormField label="Proxy setting">
									<SegmentedControl
										value={form.proxyMode ?? "none"}
										onChange={(value) =>
											setForm((c) => ({
												...c,
												proxyMode: value,
											}))
										}
										options={[
											{ value: "none", label: "No proxy" },
											{ value: "saved", label: "Saved proxies" },
											{ value: "custom", label: "Custom" },
										]}
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
									<div className="space-y-6 rounded-lg border border-border/50 bg-surface p-4">
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
							<ProfileOsPicker
								osFamily={osFamily}
								osVersion={osVersion}
								onOsFamilyChange={(value) =>
									setForm((c) => ({ ...c, osFamily: value }))
								}
								onOsVersionChange={(value) =>
									setForm((c) => ({ ...c, osVersion: value }))
								}
							/>
						) : null}

						{tab === "device" ? (
							<ProfileDeviceTab
								device={form.device ?? defaultDeviceInput()}
								presets={presetsQuery.data ?? []}
								previewSeed={previewSeed}
								onDeviceChange={(device) => setForm((c) => ({ ...c, device }))}
								onRegenerateSeed={refreshFingerprint}
							/>
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
													className="flex items-center justify-between gap-2 truncate text-muted-foreground text-xs"
												>
													<span className="truncate">{url}</span>
													<button
														type="button"
														className="shrink-0 text-muted-foreground hover:text-foreground"
														onClick={() =>
															setForm((c) => ({
																...c,
																browser: {
																	...c.browser,
																	startupUrls: (
																		c.browser?.startupUrls ?? []
																	).filter((item) => item !== url),
																},
															}))
														}
													>
														<X className="size-3" />
													</button>
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
								<FormField label="Download directory">
									<FormSelect
										value={form.browser?.downloadMode ?? "profile"}
										onValueChange={(value) =>
											setForm((c) => ({
												...c,
												browser: {
													...c.browser,
													downloadMode: value as "profile" | "custom",
												},
											}))
										}
										options={downloadModeOptions}
									/>
								</FormField>
								{form.browser?.downloadMode === "custom" ? (
									<FormField label="Custom download path">
										<Input
											className={notion.input}
											placeholder="/path/to/downloads"
											value={form.browser?.customDownloadDir ?? ""}
											onChange={(e) =>
												setForm((c) => ({
													...c,
													browser: {
														...c.browser,
														customDownloadDir: e.target.value,
													},
												}))
											}
										/>
									</FormField>
								) : null}
								<div className="flex cursor-pointer items-center gap-2.5 py-1">
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
								</div>
							</>
						) : null}

						{tab === "advanced" ? (
							<FormField label="Notes">
								<Textarea
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

				<ProfileOverviewSidebar
					form={form}
					osFamily={osFamily}
					osVersion={osVersion}
					groupName={selectedGroupName}
					proxySummary={proxySummary}
					capabilities={capabilitiesQuery.data}
					previewSeed={previewSeed}
					device={form.device ?? defaultDeviceInput()}
					onRefreshFingerprint={refreshFingerprint}
				/>
			</div>
		</PageShell>
	);
}
