import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/app/layout/app-shell";
import { AppProviders } from "@/app/providers/app-providers";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

function AppLayout() {
	return (
		<AppProviders>
			<AppShell>
				<Outlet />
			</AppShell>
		</AppProviders>
	);
}
