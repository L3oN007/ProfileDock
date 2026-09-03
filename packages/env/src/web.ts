import { createEnv } from "@t3-oss/env-core";

type ViteImportMeta = ImportMeta & {
	env: Record<string, string | boolean | undefined>;
};

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {},
	runtimeEnv: (import.meta as ViteImportMeta).env,
	emptyStringAsUndefined: true,
});
