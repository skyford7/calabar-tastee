/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Palette (matches the public site) ------------------------------------------
   page #1a1410 · surface #231a14 · raised #2a1f18 · line amber-900/30 · accent amber-500/600 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-amber-600 text-white hover:bg-amber-500 disabled:hover:bg-amber-600",
  secondary:
    "bg-[#2a1f18] text-amber-100 border border-amber-900/40 hover:border-amber-500/50",
  ghost: "text-amber-100/70 hover:text-amber-300 hover:bg-amber-900/20",
  danger: "bg-red-600/90 text-white hover:bg-red-500",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: "sm" | "md";
    loading?: boolean;
  }
>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

const fieldBase =
  "w-full rounded-lg border border-amber-900/40 bg-[#1a1410] px-3 text-sm text-amber-50 placeholder:text-amber-100/30 " +
  "focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 disabled:opacity-60";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(fieldBase, "h-10", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(fieldBase, "h-10", className)} {...p} />
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-amber-100/60">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-amber-100/40">{hint}</span>}
    </label>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm text-amber-100/80",
        disabled && "opacity-50"
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-amber-900/50 accent-amber-500"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-900/30 bg-[#231a14]",
        className
      )}
    >
      {children}
    </div>
  );
}

type Tone = "amber" | "green" | "red" | "blue" | "neutral";
const TONES: Record<Tone, string> = {
  amber: "bg-amber-500/15 text-amber-300",
  green: "bg-green-500/15 text-green-300",
  red: "bg-red-500/15 text-red-300",
  blue: "bg-sky-500/15 text-sky-300",
  neutral: "bg-amber-100/10 text-amber-100/60",
};
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone]
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-amber-100/50">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-6 w-6 animate-spin text-amber-500", className)} />
  );
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center py-16">
      <Spinner />
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-amber-900/40 px-6 py-12 text-center">
      <p className="font-medium text-amber-100/80">{title}</p>
      {children && (
        <div className="mt-2 text-sm text-amber-100/50">{children}</div>
      )}
    </div>
  );
}

export function ErrorBlock({ error }: { error: unknown }) {
  const msg =
    (error as { message?: string })?.message ?? "Could not load data.";
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {msg}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current
      ?.querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={e => e.stopPropagation()}
        className={cn(
          "flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-amber-900/40 bg-[#231a14] shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between border-b border-amber-900/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-amber-100/50 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-amber-900/30 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* Confirm dialog — const ok = await confirm({ title, message, danger }) ----- */
type ConfirmOpts = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
};
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(
  async () => false
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOpts & { resolve: (v: boolean) => void }) | null
  >(null);
  const confirm = useCallback(
    (o: ConfirmOpts) =>
      new Promise<boolean>(resolve => setState({ ...o, resolve })),
    []
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              variant={state?.danger ? "danger" : "primary"}
              onClick={() => close(true)}
            >
              {state?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <div className="text-sm text-amber-100/70">{state?.message}</div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);

/* Simple table shell */
export function Table({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-amber-900/30">
      <table className="w-full text-sm">
        <thead className="bg-[#231a14] text-left text-xs uppercase tracking-wide text-amber-100/50">
          {head}
        </thead>
        <tbody className="divide-y divide-amber-900/20">{children}</tbody>
      </table>
    </div>
  );
}
