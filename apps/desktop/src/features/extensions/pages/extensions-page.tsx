import { ContentSection, PageShell, PageTitle } from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

export function ExtensionsPage() {
	return (
		<PageShell>
			<PageTitle
				title="Extensions"
				description="Manage browser extensions for your profiles."
			/>
			<DesktopOnlyBanner />
			<ContentSection title="Extensions library">
				<div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
					<p>
						Extensions Library is planned for a future release once CloakBrowser
						extension-loading support is verified for managed runtimes.
					</p>
					<p>
						You will be able to attach extensions to profiles from a shared
						library without changing the CloakBrowser-only architecture.
					</p>
				</div>
			</ContentSection>
		</PageShell>
	);
}
