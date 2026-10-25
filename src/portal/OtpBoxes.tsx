import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/** One box per digit (like an SMS verification screen). Digits are masked as they are typed. */
export function OtpBoxes({
  length,
  value,
  onChange,
  onComplete,
  autoFocus,
  invalid,
  disabled,
  label,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const onInput = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (!d) return;
    // Typing (or autofill) can deliver several digits at once: spread them across the boxes.
    const next = (value.slice(0, i) + d).slice(0, length);
    commit(next);
    focus(Math.min(next.length, length - 1));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) commit(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    commit(text);
    focus(Math.min(text.length, length - 1));
  };

  return (
    <div role="group" aria-label={label} className="flex justify-center gap-1.5 sm:gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => {
            refs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          disabled={disabled}
          value={d}
          maxLength={length}
          onChange={e => onInput(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={e => e.currentTarget.select()}
          className={cn(
            "h-14 min-w-0 flex-1 rounded-lg border bg-[#1a1410] text-center font-mono text-xl text-white outline-none transition-colors",
            "max-w-12 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40",
            invalid ? "border-red-500/60" : d ? "border-amber-500/60" : "border-amber-900/50",
            disabled && "opacity-50"
          )}
        />
      ))}
    </div>
  );
}
