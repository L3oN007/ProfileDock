import { Button } from '@ProfileDock/ui/components/button';
import { Input } from '@ProfileDock/ui/components/input';
import { Label } from '@ProfileDock/ui/components/label';
import { Switch } from '@ProfileDock/ui/components/switch';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { notion } from '@/app/design/system';
import { SectionBlock } from '@/app/layout/page-shell';
import { useUpdateBrowserSettings } from '@/features/profiles/api/mutations';
import { useProfileBrowserSettings } from '@/features/profiles/api/queries';
import { FormSelect } from '@/features/shared/form-select';
import type { UpdateBrowserSettingsInput } from '@/types/cloak';

interface ProfileBrowserTabProps {
	profileId: string;
	isRunning: boolean;
}

export function ProfileBrowserTab({
	profileId,
	isRunning,
}: ProfileBrowserTabProps) {
	const settingsQuery = useProfileBrowserSettings(profileId);
	const updateSettings = useUpdateBrowserSettings(profileId);
	const [startupUrls, setStartupUrls] = useState<string[]>([]);
	const [newUrl, setNewUrl] = useState('');
	const [downloadMode, setDownloadMode] = useState<
		'profile' | 'custom'
	>('profile');
	const [customDownloadDir, setCustomDownloadDir] = useState('');
	const [windowMode, setWindowMode] = useState<
		'normal' | 'maximized'
	>('normal');
	const [restoreSession, setRestoreSession] = useState(true);

	useEffect(() => {
		if (!settingsQuery.data) return;
		setStartupUrls(settingsQuery.data.startup_urls);
		setDownloadMode(settingsQuery.data.download_mode);
		setCustomDownloadDir(
			settingsQuery.data.custom_download_dir ?? '',
		);
		setWindowMode(settingsQuery.data.window_mode);
		setRestoreSession(settingsQuery.data.restore_session);
	}, [settingsQuery.data]);

	const handleSave = () => {
		const input: UpdateBrowserSettingsInput = {
			startup_urls: startupUrls,
			download_mode: downloadMode,
			custom_download_dir:
				downloadMode === 'custom' ? customDownloadDir : undefined,
			window_mode: windowMode,
			restore_session: restoreSession,
		};
		updateSettings.mutate(input);
	};

	const addUrl = () => {
		const trimmed = newUrl.trim();
		if (!trimmed) return;
		setStartupUrls((current) => [...current, trimmed]);
		setNewUrl('');
	};

	return (
		<SectionBlock title='Browser'>
			{isRunning ? (
				<p className='rounded-lg bg-amber-500/10 px-3 py-2 text-amber-600 text-sm dark:text-amber-300'>
					Stop CloakBrowser before editing browser settings.
				</p>
			) : null}

			<div className='space-y-6'>
				<div className='space-y-3'>
					<p className='font-medium text-foreground text-sm'>
						Startup
					</p>
					<div className='flex items-center justify-between'>
						<Label htmlFor='restore-session'>
							Restore previous session
						</Label>
						<Switch
							id='restore-session'
							checked={restoreSession}
							disabled={isRunning}
							onCheckedChange={setRestoreSession}
						/>
					</div>

					<div className='space-y-2'>
						<Label>Startup URLs</Label>
						<div className='space-y-2 rounded-lg border border-border/50 bg-surface p-3'>
							{startupUrls.map((url) => (
								<div key={url} className='flex items-center gap-2'>
									<span className='flex-1 truncate font-mono text-foreground text-xs'>
										{url}
									</span>
									<Button
										variant='ghost'
										size='icon-sm'
										disabled={isRunning}
										onClick={() =>
											setStartupUrls((current) =>
												current.filter((item) => item !== url),
											)
										}>
										<X className='size-3.5' />
									</Button>
								</div>
							))}
							{startupUrls.length === 0 ? (
								<p className='text-muted-foreground text-xs'>
									No startup URLs configured
								</p>
							) : null}
						</div>
						<div className='flex gap-2'>
							<Input
								className={notion.input}
								placeholder='https://example.com'
								value={newUrl}
								disabled={isRunning}
								onChange={(event) => setNewUrl(event.target.value)}
							/>
							<Button
								variant='outline'
								disabled={isRunning}
								onClick={addUrl}>
								Add URL
							</Button>
						</div>
					</div>
				</div>

				<div className='space-y-3'>
					<p className='font-medium text-foreground text-sm'>
						Downloads
					</p>
					<FormSelect
						value={downloadMode}
						disabled={isRunning}
						onValueChange={(value) =>
							setDownloadMode(value as 'profile' | 'custom')
						}
						options={[
							{ value: 'profile', label: 'Profile downloads' },
							{ value: 'custom', label: 'Custom' },
						]}
					/>
					{downloadMode === 'custom' ? (
						<Input
							className={notion.input}
							placeholder='/path/to/downloads'
							value={customDownloadDir}
							disabled={isRunning}
							onChange={(event) =>
								setCustomDownloadDir(event.target.value)
							}
						/>
					) : null}
				</div>

				<div className='space-y-3'>
					<p className='font-medium text-foreground text-sm'>
						Window
					</p>
					<FormSelect
						value={windowMode}
						disabled={isRunning}
						onValueChange={(value) =>
							setWindowMode(value as 'normal' | 'maximized')
						}
						options={[
							{ value: 'normal', label: 'Normal' },
							{ value: 'maximized', label: 'Maximized' },
						]}
					/>
				</div>

				<div className='flex justify-end'>
					<Button
						disabled={
							isRunning ||
							updateSettings.isPending ||
							settingsQuery.isLoading
						}
						onClick={handleSave}>
						Save
					</Button>
				</div>
			</div>
		</SectionBlock>
	);
}
