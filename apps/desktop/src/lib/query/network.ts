import { useQuery } from "@tanstack/react-query";

import { fetchNetworkInfo } from "@/lib/network/ip-api";

export const networkKeys = {
	all: ["network"] as const,
	info: () => [...networkKeys.all, "info"] as const,
};

export function useNetworkInfo() {
	return useQuery({
		queryKey: networkKeys.info(),
		queryFn: fetchNetworkInfo,
		staleTime: 5 * 60_000,
		refetchInterval: 5 * 60_000,
		retry: 1,
	});
}
