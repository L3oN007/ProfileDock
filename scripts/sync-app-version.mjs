import { readFileSync, writeFileSync } from "node:fs";

const desktopPkgPath = "apps/desktop/package.json";
const desktopPkg = JSON.parse(readFileSync(desktopPkgPath, "utf8"));
const version = desktopPkg.version;

const tauriConfPath = "apps/desktop/src-tauri/tauri.conf.json";
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, "\t")}\n`);

const cargoPath = "apps/desktop/src-tauri/Cargo.toml";
const cargo = readFileSync(cargoPath, "utf8").replace(
	/^version = ".*"$/m,
	`version = "${version}"`,
);
writeFileSync(cargoPath, cargo);

console.log(`Synced app version to ${version}`);
