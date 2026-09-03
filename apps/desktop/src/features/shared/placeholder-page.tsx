export function PlaceholderPage({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-2 p-8">
			<h1 className="font-semibold text-2xl">{title}</h1>
			<p className="text-muted-foreground">{description}</p>
		</div>
	);
}
