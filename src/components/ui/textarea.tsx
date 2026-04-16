import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, onInput, ...props }: React.ComponentProps<"textarea">) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const resize = React.useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }, [])

  React.useEffect(() => {
    resize(innerRef.current)
  }, [props.value, resize])

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      ref={(element) => {
        innerRef.current = element
        if (typeof props.ref === "function") {
          props.ref(element)
        } else if (props.ref) {
          props.ref.current = element
        }
      }}
      onInput={(event) => {
        resize(event.currentTarget)
        onInput?.(event)
      }}
    />
  )
}

export { Textarea }