import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const desktopPkg = JSON.parse(
	readFileSync("apps/desktop/package.json", "utf8"),
);
const tag = `v${desktopPkg.version}`;

try {
	execSync(`git rev-parse ${tag}`, { stdio: "ignore" });
	console.log(`Tag ${tag} already exists, skipping.`);
} catch {
	execSync(`git tag ${tag}`, { stdio: "inherit" });
	execSync(`git push origin ${tag}`, { stdio: "inherit" });
	console.log(`Created and pushed tag ${tag}`);
}
