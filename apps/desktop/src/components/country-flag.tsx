import { hasFlag } from "country-flag-icons";
import * as FlagIcons from "country-flag-icons/react/3x2";
import type { ComponentType, SVGProps } from "react";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

const flags = FlagIcons as Record<string, FlagComponent>;

interface CountryFlagProps {
	code: string;
	className?: string;
	title?: string;
}

export function CountryFlag({
	code,
	className = "inline-block h-3 w-4 shrink-0 rounded-sm object-cover",
	title,
}: CountryFlagProps) {
	const normalized = code?.trim().toUpperCase() ?? "";
	if (normalized.length !== 2 || !hasFlag(normalized)) {
		return (
			<span className="text-xs" aria-hidden>
				🌐
			</span>
		);
	}

	const Flag = flags[normalized];
	if (!Flag) {
		return (
			<span className="text-xs" aria-hidden>
				{normalized}
			</span>
		);
	}

	return <Flag className={className} aria-label={title ?? normalized} />;
}
