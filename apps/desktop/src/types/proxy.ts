export type ProxyProtocol = "http" | "https" | "socks5";

export type ProxyHealthStatus = "unknown" | "healthy" | "unhealthy";

export interface ProxyCheckResult {
	success: boolean;
	latencyMs: number | null;
	observedIp: string | null;
	errorCode: string | null;
	checkedAt: string;
}

export interface Proxy {
	id: string;
	name: string;
	protocol: ProxyProtocol;
	host: string;
	port: number;
	hasAuth: boolean;
	isEnabled: boolean;
	isArchived: boolean;
	healthStatus: ProxyHealthStatus;
	lastCheck: ProxyCheckResult | null;
	assignedProfileCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface ProxyAssignment {
	profileId: string;
	profileName: string;
	proxyId: string;
	assignedAt: string;
}

export interface ProxySummary {
	id: string;
	name: string;
	protocol: ProxyProtocol;
	host: string;
	port: number;
	hasAuth: boolean;
	healthStatus: ProxyHealthStatus;
}

export interface ProfileProxyAssignment {
	profileId: string;
	proxy: ProxySummary | null;
	assignedAt: string | null;
}

export interface CreateProxyInput {
	name: string;
	protocol: ProxyProtocol;
	host: string;
	port: number;
	username?: string;
	password?: string;
}

export type CredentialUpdate =
	| { mode: "keep" }
	| { mode: "replace"; value: string }
	| { mode: "remove" };

export interface UpdateProxyInput {
	name?: string;
	protocol?: ProxyProtocol;
	host?: string;
	port?: number;
	username?: string;
	password?: CredentialUpdate;
	isEnabled?: boolean;
}

export interface TestProxyInput {
	protocol: ProxyProtocol;
	host: string;
	port: number;
	username?: string;
	password?: string;
}
