import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function DesktopOnlyBanner() {
	if (isDesktopRuntime()) {
		return null;
	}

	return (
		<div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100/90 text-sm">
			Web preview mode — backend chỉ khả dụng trong desktop app. Chạy{" "}
			<code className="rounded bg-[#1e2230] px-1 py-0.5 text-xs">
				pnpm desktop:dev
			</code>{" "}
			để dùng đầy đủ tính năng.
		</div>
	);
}
