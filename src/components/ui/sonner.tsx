import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Dark-themed toaster (the site is dark-only, so no next-themes dependency). */
const Toaster = (props: ToasterProps) => <Sonner theme="dark" className="toaster group" {...props} />

export { Toaster }
