import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	clearScreen: false,
	server: {
		port: 3001,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	envPrefix: [
		"VITE_",
		"TAURI_ENV_PLATFORM",
		"TAURI_ENV_ARCH",
		"TAURI_ENV_FAMILY",
		"TAURI_ENV_PLATFORM_VERSION",
		"TAURI_ENV_PLATFORM_TYPE",
		"TAURI_ENV_DEBUG",
	],
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
});
