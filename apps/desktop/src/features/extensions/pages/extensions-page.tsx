import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function ExtensionsPage() {
	return (
		<PageShell>
			<DesktopOnlyBanner />
			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Extensions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-[#8b93a1] text-sm">
					<p>
						Extensions Library is planned for a future release once CloakBrowser
						extension-loading support is verified for managed runtimes.
					</p>
					<p>
						You will be able to attach extensions to profiles from a shared
						library without changing the CloakBrowser-only architecture.
					</p>
				</CardContent>
			</Card>
		</PageShell>
	);
}
