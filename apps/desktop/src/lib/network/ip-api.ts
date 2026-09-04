import { invokeCommand } from "@/lib/tauri/client";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { NetworkInfo } from "@/types/network";

interface IpWhoResponse {
	success?: boolean;
	ip?: string;
	country?: string;
	country_code?: string;
	region?: string;
	city?: string;
	connection?: { isp?: string };
	latitude?: number;
	longitude?: number;
	message?: string;
}

interface IpApiCoResponse {
	ip?: string;
	country_name?: string;
	country_code?: string;
	region?: string;
	city?: string;
	org?: string;
	latitude?: number;
	longitude?: number;
	error?: boolean;
	reason?: string;
}

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
	if (isDesktopRuntime()) {
		return invokeCommand<NetworkInfo>("get_network_info");
	}

	try {
		return await fetchFromIpWho();
	} catch {
		return fetchFromIpApiCo();
	}
}

async function fetchFromIpWho(): Promise<NetworkInfo> {
	const response = await fetch("https://ipwho.is/", {
		signal: AbortSignal.timeout(8_000),
	});
	if (!response.ok) {
		throw new Error("ipwho request failed");
	}

	const data = (await response.json()) as IpWhoResponse;
	if (!data.success || !data.ip) {
		throw new Error(data.message ?? "ipwho returned invalid data");
	}

	return mapNetworkInfo({
		ip: data.ip,
		country: data.country ?? "Unknown",
		countryCode: data.country_code ?? "XX",
		region: data.region ?? "",
		city: data.city ?? "",
		isp: data.connection?.isp ?? null,
		latitude: data.latitude ?? null,
		longitude: data.longitude ?? null,
	});
}

async function fetchFromIpApiCo(): Promise<NetworkInfo> {
	const response = await fetch("https://ipapi.co/json/", {
		signal: AbortSignal.timeout(8_000),
	});
	if (!response.ok) {
		throw new Error("ipapi.co request failed");
	}

	const data = (await response.json()) as IpApiCoResponse;
	if (data.error || !data.ip) {
		throw new Error(data.reason ?? "ipapi.co returned invalid data");
	}

	return mapNetworkInfo({
		ip: data.ip,
		country: data.country_name ?? "Unknown",
		countryCode: data.country_code ?? "XX",
		region: data.region ?? "",
		city: data.city ?? "",
		isp: data.org ?? null,
		latitude: data.latitude ?? null,
		longitude: data.longitude ?? null,
	});
}

function mapNetworkInfo(data: NetworkInfo): NetworkInfo {
	return {
		ip: data.ip,
		country: data.country,
		countryCode: data.countryCode.toUpperCase(),
		region: data.region,
		city: data.city,
		isp: data.isp,
		latitude: data.latitude,
		longitude: data.longitude,
	};
}

export function countryFlag(countryCode: string) {
	if (countryCode?.length !== 2) return "🌐";
	return countryCode
		.toUpperCase()
		.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function formatNetworkLocation(info: NetworkInfo) {
	const parts = [info.city, info.region, info.country].filter(Boolean);
	return parts.join(" / ") || info.country;
}
