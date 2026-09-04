import { Construction } from 'lucide-react';

import {
	EmptyState,
	PageShell,
	PageTitle,
} from '@/app/layout/page-shell';

export function PlaceholderPage({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<PageShell>
			<PageTitle title={title} description={description} />
			<div className='flex flex-col items-center py-12'>
				<div className='mb-4 flex size-12 items-center justify-center rounded-full border border-border/50 bg-surface text-muted-foreground'>
					<Construction className='size-5' />
				</div>
				<EmptyState title={title} description={description} />
			</div>
		</PageShell>
	);
}
