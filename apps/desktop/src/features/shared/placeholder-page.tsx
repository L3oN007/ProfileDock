import { Card, CardContent } from "@ProfileDock/ui/components/card";
import { Construction } from "lucide-react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";

export function PlaceholderPage({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<PageShell>
			<Card className={panelClassName}>
				<CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-[#1e2230] text-[#8b93a1]">
						<Construction className="size-5" />
					</div>
					<div>
						<h2 className="font-medium text-[#eef1f6] text-lg">{title}</h2>
						<p className="mt-1 max-w-md text-[#8b93a1] text-sm">{description}</p>
					</div>
				</CardContent>
			</Card>
		</PageShell>
	);
}
