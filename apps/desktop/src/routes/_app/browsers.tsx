import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/browsers")({
	beforeLoad: () => {
		throw redirect({ to: "/settings" });
	},
});
