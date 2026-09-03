import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function DesktopOnlyBanner() {
	if (isDesktopRuntime()) {
		return null;
	}

	return (
		<div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
			Web preview mode — backend status chỉ khả dụng trong desktop app. Chạy{" "}
			<code className="rounded bg-muted px-1 py-0.5">pnpm desktop:dev</code> để
			kiểm tra database, storage và browser.
		</div>
	);
}
