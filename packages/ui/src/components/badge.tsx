import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ProfileDock/ui/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/10 text-primary [a]:hover:bg-primary/15",
        secondary:
          "border-border bg-muted/80 text-muted-foreground [a]:hover:bg-muted",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive [a]:hover:bg-destructive/15",
        outline:
          "border-border bg-background text-foreground [a]:hover:bg-muted",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
        neutral:
          "border-border/80 bg-muted/70 text-muted-foreground [a]:hover:bg-muted",
        info:
          "border-[color-mix(in_oklab,#2783de_28%,transparent)] bg-[color-mix(in_oklab,#2783de_12%,transparent)] text-[#1a6fc9] dark:text-[#6eb3f7]",
        success:
          "border-[color-mix(in_oklab,#448361_28%,transparent)] bg-[color-mix(in_oklab,#448361_12%,transparent)] text-[#2f6b4d] dark:text-[#7ec9a0]",
        warning:
          "border-[color-mix(in_oklab,#d9730d_28%,transparent)] bg-[color-mix(in_oklab,#d9730d_12%,transparent)] text-[#b45309] dark:text-[#f0b35c]",
        danger:
          "border-destructive/25 bg-destructive/10 text-destructive [a]:hover:bg-destructive/15",
        primary:
          "border-primary/20 bg-primary/10 text-primary [a]:hover:bg-primary/15",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
