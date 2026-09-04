import { Badge } from '@ProfileDock/ui/components/badge';
import { Button } from '@ProfileDock/ui/components/button';
import { Checkbox } from '@ProfileDock/ui/components/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@ProfileDock/ui/components/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@ProfileDock/ui/components/dropdown-menu';
import { Input } from '@ProfileDock/ui/components/input';
import { Skeleton } from '@ProfileDock/ui/components/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@ProfileDock/ui/components/table';
import { cn } from '@ProfileDock/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import {
	ArrowUpRight,
	MoreHorizontal,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { notion } from '@/app/design/system';
import {
	ContentSection,
	EmptyState,
	PageShell,
	PageTitle,
	StatsBar,
	StatTile,
} from '@/app/layout/page-shell';
import { FilterSelect } from '@/features/shared/filter-select';
import { DesktopOnlyBanner } from '@/features/shared/desktop-only-banner';

export interface OrganizationResource {
	id: string;
	name: string;
	profile_count: number;
	created_at: string;
}

export interface OrganizationResourceConfig {
	title: string;
	description: string;
	singular: string;
	plural: string;
	createLabel: string;
	searchPlaceholder: string;
	emptyTitle: string;
	emptyDescription: string;
	Icon: LucideIcon;
	profilesFilterKey: 'groupId' | 'tagId';
}

type SortKey =
	| 'name_asc'
	| 'name_desc'
	| 'profiles_desc'
	| 'created_desc'
	| 'created_asc';

const SORT_OPTIONS = [
	{ value: 'name_asc', label: 'Name A–Z' },
	{ value: 'name_desc', label: 'Name Z–A' },
	{ value: 'profiles_desc', label: 'Most profiles' },
	{ value: 'created_desc', label: 'Newest first' },
	{ value: 'created_asc', label: 'Oldest first' },
];

function formatDateTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function sortItems<T extends OrganizationResource>(
	items: T[],
	sort: SortKey,
) {
	const next = [...items];
	switch (sort) {
		case 'name_asc':
			return next.sort((a, b) => a.name.localeCompare(b.name));
		case 'name_desc':
			return next.sort((a, b) => b.name.localeCompare(a.name));
		case 'profiles_desc':
			return next.sort((a, b) => b.profile_count - a.profile_count);
		case 'created_asc':
			return next.sort(
				(a, b) =>
					new Date(a.created_at).getTime() -
					new Date(b.created_at).getTime(),
			);
		case 'created_desc':
		default:
			return next.sort(
				(a, b) =>
					new Date(b.created_at).getTime() -
					new Date(a.created_at).getTime(),
			);
	}
}

function StatCard({
	label,
	value,
	tone = 'default',
}: {
	label: string;
	value: string | number;
	tone?: 'default' | 'warning' | 'primary';
}) {
	return (
		<StatTile
			label={label}
			value={value}
			tone={tone}
			variant='segment'
		/>
	);
}

interface OrganizationResourcePageProps {
	config: OrganizationResourceConfig;
	items: OrganizationResource[];
	isLoading: boolean;
	isFetching: boolean;
	onRefresh: () => void;
	onCreate: (name: string) => void;
	isCreating: boolean;
	onDelete: (id: string) => void;
	onRename?: (id: string, name: string) => void;
	isDeleting?: boolean;
	isRenaming?: boolean;
}

export function OrganizationResourcePage({
	config,
	items,
	isLoading,
	isFetching,
	onRefresh,
	onCreate,
	isCreating,
	onDelete,
	onRename,
	isDeleting = false,
	isRenaming = false,
}: OrganizationResourcePageProps) {
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<SortKey>('created_desc');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [createName, setCreateName] = useState('');
	const [renameTarget, setRenameTarget] =
		useState<OrganizationResource | null>(null);
	const [renameName, setRenameName] = useState('');
	const [deleteTarget, setDeleteTarget] =
		useState<OrganizationResource | null>(null);

	const filteredItems = useMemo(() => {
		const query = search.trim().toLowerCase();
		const matched = query
			? items.filter((item) =>
					item.name.toLowerCase().includes(query),
				)
			: items;
		return sortItems(matched, sort);
	}, [items, search, sort]);

	const stats = useMemo(() => {
		const totalProfiles = items.reduce(
			(sum, item) => sum + item.profile_count,
			0,
		);
		const unused = items.filter(
			(item) => item.profile_count === 0,
		).length;
		return {
			total: items.length,
			totalProfiles,
			unused,
		};
	}, [items]);

	const allSelected =
		filteredItems.length > 0 &&
		filteredItems.every((item) => selectedIds.includes(item.id));
	const someSelected = selectedIds.length > 0;

	const toggleAll = (checked: boolean) => {
		setSelectedIds(
			checked ? filteredItems.map((item) => item.id) : [],
		);
	};

	const toggleOne = (id: string, checked: boolean) => {
		setSelectedIds((current) =>
			checked
				? [...current, id]
				: current.filter((item) => item !== id),
		);
	};

	const handleCreate = () => {
		const trimmed = createName.trim();
		if (!trimmed) return;
		onCreate(trimmed);
		setCreateName('');
		setCreateOpen(false);
	};

	const handleRename = () => {
		if (!renameTarget || !onRename) return;
		const trimmed = renameName.trim();
		if (!trimmed) return;
		onRename(renameTarget.id, trimmed);
		setRenameTarget(null);
		setRenameName('');
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		onDelete(deleteTarget.id);
		setDeleteTarget(null);
		setSelectedIds((current) =>
			current.filter((id) => id !== deleteTarget.id),
		);
	};

	const handleBulkDelete = () => {
		for (const id of selectedIds) {
			onDelete(id);
		}
		setSelectedIds([]);
	};

	const profilesSearch =
		config.profilesFilterKey === 'groupId'
			? (id: string) => ({ groupId: id })
			: (id: string) => ({ tagId: id });

	return (
		<PageShell>
			<PageTitle
				title={config.title}
				description={config.description}
				actions={
					<Button size='sm' onClick={() => setCreateOpen(true)}>
						<Plus className='size-3.5' />
						{config.createLabel}
					</Button>
				}
			/>
			<DesktopOnlyBanner />

			<StatsBar columns={3}>
				<StatCard
					label={`Total ${config.plural}`}
					value={stats.total}
				/>
				<StatCard
					label='Profiles linked'
					value={stats.totalProfiles}
					tone='primary'
				/>
				<StatCard
					label='Unused'
					value={stats.unused}
					tone={stats.unused > 0 ? 'warning' : 'default'}
				/>
			</StatsBar>

			<ContentSection
				title={`All ${config.plural}`}
				actions={
					<div className='flex flex-wrap items-center gap-2'>
						<div className='relative min-w-[200px]'>
							<Search className='absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground' />
							<Input
								className={`${notion.input} pl-8`}
								placeholder={config.searchPlaceholder}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<FilterSelect
							value={sort}
							onValueChange={(value) => setSort(value as SortKey)}
							options={SORT_OPTIONS}
						/>
						<Button
							size='sm'
							variant='outline'
							disabled={isFetching}
							onClick={onRefresh}>
							<RefreshCw
								className={cn(
									'size-3.5',
									isFetching && 'animate-spin',
								)}
							/>
							Refresh
						</Button>
					</div>
				}
				contentClassName='p-0'>
				{someSelected ? (
					<div className='flex flex-wrap items-center justify-between gap-3 border-border/50 border-b bg-surface px-0 py-3'>
						<p className='text-foreground text-sm'>
							<span className='font-medium'>
								{selectedIds.length}
							</span>{' '}
							selected
						</p>
						<Button
							size='sm'
							variant='outline'
							className='text-destructive hover:text-destructive'
							disabled={isDeleting}
							onClick={handleBulkDelete}>
							<Trash2 className='size-3.5' />
							Delete selected
						</Button>
					</div>
				) : null}

				{isLoading ? (
					<div className='space-y-2 px-5 py-4'>
						<Skeleton className='h-10 w-full rounded-lg' />
						<Skeleton className='h-10 w-full rounded-lg' />
						<Skeleton className='h-10 w-full rounded-lg' />
					</div>
				) : filteredItems.length === 0 ? (
					<div className='px-5 py-4'>
						<EmptyState
							title={
								search
									? `No ${config.plural} match your search`
									: config.emptyTitle
							}
							description={
								search
									? 'Try a different keyword or clear the search filter.'
									: config.emptyDescription
							}
						/>
					</div>
				) : (
					<div className='overflow-hidden rounded-lg'>
						<Table>
							<TableHeader>
								<TableRow className={notion.tableHead}>
									<TableHead className='w-10'>
										<Checkbox
											checked={allSelected}
											onCheckedChange={(checked) =>
												toggleAll(checked === true)
											}
											aria-label={`Select all ${config.plural}`}
										/>
									</TableHead>
									<TableHead>{config.singular}</TableHead>
									<TableHead>Profiles</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className='w-28 text-right'>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredItems.map((item) => {
									const isSelected = selectedIds.includes(item.id);
									return (
										<TableRow
											key={item.id}
											className={notion.tableRow}>
											<TableCell>
												<Checkbox
													checked={isSelected}
													onCheckedChange={(checked) =>
														toggleOne(item.id, checked === true)
													}
													aria-label={`Select ${item.name}`}
												/>
											</TableCell>
											<TableCell>
												<div className='flex items-center gap-2.5'>
													<div className='flex size-7 items-center justify-center rounded-md border border-border/70 bg-surface'>
														<config.Icon className='size-3.5 text-muted-foreground' />
													</div>
													<span className='font-medium text-foreground text-sm'>
														{item.name}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={
														item.profile_count > 0
															? 'info'
															: 'neutral'
													}>
													{item.profile_count}
												</Badge>
											</TableCell>
											<TableCell className='text-muted-foreground text-xs'>
												{formatDateTime(item.created_at)}
											</TableCell>
											<TableCell className='text-right'>
												<div className='flex items-center justify-end gap-1'>
													<Button
														size='sm'
														variant='outline'
														render={
															<Link
																to='/profiles'
																search={profilesSearch(item.id)}
															/>
														}>
														<ArrowUpRight className='size-3.5' />
														View
													</Button>
													<DropdownMenu>
														<DropdownMenuTrigger
															render={
																<Button
																	size='icon-sm'
																	variant='outline'
																	aria-label={`Actions for ${item.name}`}
																/>
															}>
															<MoreHorizontal className='size-3.5' />
														</DropdownMenuTrigger>
														<DropdownMenuContent
															align='end'
															className='min-w-40 rounded-md'>
															{onRename ? (
																<DropdownMenuItem
																	className='gap-2 rounded-sm'
																	onClick={() => {
																		setRenameTarget(item);
																		setRenameName(item.name);
																	}}>
																	<Pencil className='size-3.5' />
																	Rename
																</DropdownMenuItem>
															) : null}
															<DropdownMenuItem
																className='gap-2 rounded-sm'
																render={
																	<Link
																		to='/profiles'
																		search={profilesSearch(item.id)}
																	/>
																}>
																<ArrowUpRight className='size-3.5' />
																View profiles
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																variant='destructive'
																className='gap-2 rounded-sm'
																onClick={() => setDeleteTarget(item)}>
																<Trash2 className='size-3.5' />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</ContentSection>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className='rounded-xl sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>{config.createLabel}</DialogTitle>
						<DialogDescription>
							Enter a name for the new {config.singular.toLowerCase()}
							.
						</DialogDescription>
					</DialogHeader>
					<Input
						className={notion.input}
						autoFocus
						placeholder={`${config.singular} name`}
						value={createName}
						onChange={(e) => setCreateName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleCreate();
						}}
					/>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							disabled={!createName.trim() || isCreating}
							onClick={handleCreate}>
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{onRename ? (
				<Dialog
					open={renameTarget != null}
					onOpenChange={(open) => {
						if (!open) setRenameTarget(null);
					}}>
					<DialogContent className='rounded-xl sm:max-w-md'>
						<DialogHeader>
							<DialogTitle>
								Rename {config.singular.toLowerCase()}
							</DialogTitle>
							<DialogDescription>
								Update the name for &ldquo;{renameTarget?.name}
								&rdquo;.
							</DialogDescription>
						</DialogHeader>
						<Input
							className={notion.input}
							autoFocus
							value={renameName}
							onChange={(e) => setRenameName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleRename();
							}}
						/>
						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setRenameTarget(null)}>
								Cancel
							</Button>
							<Button
								disabled={!renameName.trim() || isRenaming}
								onClick={handleRename}>
								Save
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : null}

			<Dialog
				open={deleteTarget != null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}>
				<DialogContent className='rounded-xl sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>
							Delete {config.singular.toLowerCase()}?
						</DialogTitle>
						<DialogDescription>
							{deleteTarget && deleteTarget.profile_count > 0
								? `"${deleteTarget.name}" is linked to ${deleteTarget.profile_count} profile(s). Deleting will remove the ${config.singular.toLowerCase()} assignment but profiles will remain.`
								: `This will permanently delete "${deleteTarget?.name}".`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button
							variant='destructive'
							disabled={isDeleting}
							onClick={handleDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
