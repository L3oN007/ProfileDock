import { createFileRoute } from "@tanstack/react-router";

import { ProxyDetailPage } from "@/features/proxies/pages/proxy-detail-page";

export const Route = createFileRoute("/_app/proxies/$proxyId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { proxyId } = Route.useParams();
	return <ProxyDetailPage proxyId={proxyId} />;
}
