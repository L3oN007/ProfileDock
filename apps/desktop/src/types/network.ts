export interface NetworkInfo {
	ip: string;
	country: string;
	countryCode: string;
	region: string;
	city: string;
	isp: string | null;
	latitude: number | null;
	longitude: number | null;
}
