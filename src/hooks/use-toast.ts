import { toast as sonnerToast } from "sonner";

// Diagnostic: this adapter does not use React hooks
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info("[toast] adapter loaded (no React hooks)");
}

export type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const message = title || description || "";
    const opts: Record<string, any> = {};
    if (description && title) {
      opts.description = description;
    }
    if (variant === "destructive") {
      opts.style = { background: "#ef4444", color: "white" };
    }
    sonnerToast(message, opts);
  };

  const dismiss = (_id?: string) => {
    // no-op adapter
  };

  return {
    toasts: [],
    toast,
    dismiss,
  } as const;
}

export const toast = sonnerToast;
