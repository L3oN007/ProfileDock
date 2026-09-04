import { Button } from '@ProfileDock/ui/components/button';
import { Input } from '@ProfileDock/ui/components/input';
import { Label } from '@ProfileDock/ui/components/label';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { notion } from '@/app/design/system';
import {
	DetailRow,
	PageShell,
	PageTitle,
	SectionBlock,
} from '@/app/layout/page-shell';
import {
	useAutoConfigureCloak,
	useCloakCapabilities,
	useCloakInstallation,
	useDiscoveredCloakInstallations,
	useSetCloakExecutable,
	useValidateCloakInstallation,
} from '@/features/cloak/api/queries';
import {
	useActivateCloakRuntime,
	useCloakRuntimeList,
	useCloakRuntimeStatus,
	useCloakRuntimeUpdate,
	useInstallCloakRuntime,
	useRemoveCloakRuntime,
} from '@/features/cloak/api/runtime-queries';
import { DesktopOnlyBanner } from '@/features/shared/desktop-only-banner';
import { isDesktopRuntime } from '@/lib/tauri/runtime';

export function BrowserSettingsPage() {
	const desktop = isDesktopRuntime();
	const installationQuery = useCloakInstallation();
	const capabilitiesQuery = useCloakCapabilities();
	const discoveredQuery = useDiscoveredCloakInstallations();
	const setExecutable = useSetCloakExecutable();
	const validateInstallation = useValidateCloakInstallation();
	const autoConfigure = useAutoConfigureCloak();
	const runtimeStatusQuery = useCloakRuntimeStatus();
	const runtimeListQuery = useCloakRuntimeList();
	const runtimeUpdateQuery = useCloakRuntimeUpdate();
	const installRuntime = useInstallCloakRuntime();
	const activateRuntime = useActivateCloakRuntime();
	const removeRuntime = useRemoveCloakRuntime();
	const [executablePath, setExecutablePath] = useState('');

	const installation = installationQuery.data;
	const runtimeStatus = runtimeStatusQuery.data;
	const installProgress = installRuntime.progress;
	const statusColor = installation?.valid
		? installation.compatible
			? 'text-emerald-400'
			: 'text-amber-400'
		: installation?.executable
			? 'text-red-400'
			: 'text-amber-400';

	return (
		<PageShell>
			<PageTitle
				title='Settings'
				description='Configure CloakBrowser runtime and installation paths.'
			/>
			<DesktopOnlyBanner />

			<div className='space-y-10'>
				<SectionBlock title='Managed CloakBrowser Runtime'>
					<div>
						<DetailRow
							label='Active version'
							value={
								runtimeStatus?.active_runtime?.version ??
								'Not installed'
							}
						/>
						<DetailRow
							label='Managed runtimes'
							value={String(runtimeStatus?.managed_count ?? 0)}
						/>
					</div>

					{runtimeUpdateQuery.data?.update_available ? (
						<p className='text-amber-400 text-sm'>
							Update available:{' '}
							{runtimeUpdateQuery.data.available_version}
						</p>
					) : null}

					{installProgress &&
					installProgress.phase !== 'completed' &&
					installProgress.phase !== 'failed' ? (
						<div className='space-y-2 rounded-lg border border-border/50 bg-surface p-4 text-sm'>
							<p className='font-medium text-foreground'>
								Installing {installProgress.version ?? 'CloakBrowser'}
							</p>
							<p className='text-muted-foreground capitalize'>
								{installProgress.phase}
								{installProgress.message
									? ` · ${installProgress.message}`
									: ''}
							</p>
							{installProgress.percent != null ? (
								<div className='h-2 overflow-hidden rounded-full bg-muted'>
									<div
										className='h-full bg-primary transition-all'
										style={{ width: `${installProgress.percent}%` }}
									/>
								</div>
							) : null}
						</div>
					) : null}

					<Button
						disabled={!desktop || installRuntime.isPending}
						onClick={() => installRuntime.mutate(undefined)}>
						{runtimeStatus?.installed
							? 'Reinstall / Update'
							: 'Install CloakBrowser'}
					</Button>

					{(runtimeListQuery.data ?? []).length > 0 ? (
						<div className='space-y-2 border-border/50 border-t pt-4'>
							<p className='font-medium text-foreground text-sm'>
								Installed versions
							</p>
							<ul className='divide-y divide-border/50'>
								{(runtimeListQuery.data ?? []).map((runtime) => (
									<li
										key={runtime.id}
										className='flex items-start justify-between gap-3 py-3 text-sm'>
										<div>
											<p className='text-foreground'>
												{runtime.version}
												{runtime.active ? (
													<span className='ml-2 text-emerald-400 text-xs'>
														Active
													</span>
												) : null}
											</p>
											<p className='font-mono text-muted-foreground text-xs'>
												{runtime.root_dir}
											</p>
										</div>
										<div className='flex shrink-0 gap-2'>
											{!runtime.active ? (
												<Button
													size='sm'
													variant='outline'
													disabled={
														!desktop ||
														activateRuntime.isPending ||
														installRuntime.isPending
													}
													onClick={() =>
														activateRuntime.mutate(runtime.id)
													}>
													Activate
												</Button>
											) : null}
											{!runtime.active ? (
												<Button
													size='sm'
													variant='outline'
													className='text-destructive hover:text-destructive'
													disabled={
														!desktop ||
														removeRuntime.isPending ||
														installRuntime.isPending
													}
													onClick={() =>
														removeRuntime.mutate(runtime.id)
													}>
													Remove
												</Button>
											) : null}
										</div>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</SectionBlock>

				<SectionBlock title='CloakBrowser Installation'>
					<div>
						<DetailRow
							label='Executable'
							value={
								<span className='break-all font-mono text-xs'>
									{installation?.executable ?? 'Not configured'}
								</span>
							}
						/>
						<DetailRow
							label='Installation directory'
							value={
								<span className='break-all font-mono text-xs'>
									{installation?.root_dir ?? '—'}
								</span>
							}
						/>
						<DetailRow
							label='Cache directory'
							value={
								<span className='break-all font-mono text-xs'>
									{installation?.cache_dir ?? '—'}
								</span>
							}
						/>
						<DetailRow
							label='Version'
							value={installation?.version ?? '—'}
						/>
						<DetailRow
							label='Status'
							value={
								<span className={statusColor}>
									{!desktop
										? 'Desktop only'
										: installation?.valid
											? installation.compatible
												? 'Ready'
												: 'Detected (compatibility unknown)'
											: installation?.executable
												? 'Invalid'
												: 'Not detected'}
								</span>
							}
						/>
					</div>

					<div className='space-y-2 rounded-lg border border-border/50 bg-surface p-4 text-sm'>
						<p className='font-medium text-foreground'>
							Development setup
						</p>
						<p className='text-muted-foreground'>
							Ubuntu/Linux:{' '}
							<code className='text-xs'>pnpm cloak:setup:linux</code>
						</p>
						<p className='text-muted-foreground'>
							Windows PowerShell:{' '}
							<code className='text-xs'>
								pnpm cloak:setup:windows
							</code>
						</p>
						<p className='text-muted-foreground text-xs'>
							Use native Windows PowerShell for CloakBrowser on
							Windows, not WSL.
						</p>
					</div>

					{capabilitiesQuery.data ? (
						<div className='space-y-2 border-border/50 border-t pt-4'>
							<p className='font-medium text-foreground text-sm'>
								Capabilities
							</p>
							<CapabilityRow
								label='Startup URLs'
								supported={capabilitiesQuery.data.startup_urls}
							/>
							<CapabilityRow
								label='Proxy'
								supported={capabilitiesQuery.data.proxy}
							/>
							<CapabilityRow
								label='Download directory'
								supported={capabilitiesQuery.data.custom_download_dir}
							/>
							<CapabilityRow
								label='Window configuration'
								supported={
									capabilitiesQuery.data.window_configuration
								}
							/>
						</div>
					) : null}

					{(discoveredQuery.data ?? []).length > 0 ? (
						<div className='space-y-2 border-border/50 border-t pt-4'>
							<p className='font-medium text-foreground text-sm'>
								Discovered installations
							</p>
							<ul className='divide-y divide-border/50'>
								{(discoveredQuery.data ?? []).map((item) => (
									<li
										key={item.executable}
										className='flex items-start justify-between gap-3 py-3 text-sm'>
										<div className='min-w-0'>
											<p className='truncate font-mono text-foreground text-xs'>
												{item.executable}
											</p>
											<p className='text-muted-foreground text-xs'>
												{item.version ?? 'unknown version'} ·{' '}
												{item.source}
											</p>
										</div>
										<Button
											size='sm'
											variant='outline'
											className='shrink-0'
											disabled={
												!desktop ||
												!item.valid ||
												setExecutable.isPending
											}
											onClick={() =>
												setExecutable.mutate(item.executable)
											}>
											Use
										</Button>
									</li>
								))}
							</ul>
						</div>
					) : null}

					<div className='space-y-2 border-border/50 border-t pt-4'>
						<Label htmlFor='browser-executable'>
							Manual executable path
						</Label>
						<Input
							id='browser-executable'
							className={notion.input}
							placeholder='~/.cloakbrowser/chromium-.../chrome'
							value={executablePath}
							onChange={(event) =>
								setExecutablePath(event.target.value)
							}
						/>
						<div className='flex flex-wrap gap-2'>
							<Button
								disabled={!desktop || autoConfigure.isPending}
								onClick={() => autoConfigure.mutate()}>
								Auto-detect
							</Button>
							<Button
								disabled={
									!desktop ||
									!executablePath ||
									setExecutable.isPending
								}
								onClick={() => setExecutable.mutate(executablePath)}>
								Save executable
							</Button>
							<Button
								variant='outline'
								disabled={!desktop || validateInstallation.isPending}
								onClick={() => validateInstallation.mutate()}>
								Validate installation
							</Button>
						</div>
					</div>
				</SectionBlock>
			</div>
		</PageShell>
	);
}

function CapabilityRow({
	label,
	supported,
}: {
	label: string;
	supported: boolean;
}) {
	return (
		<div className='flex justify-between text-sm'>
			<span className='text-muted-foreground'>{label}</span>
			<span
				className={
					supported ? 'text-emerald-400' : 'text-muted-foreground'
				}>
				{supported ? 'Supported' : 'Unsupported'}
			</span>
		</div>
	);
}
