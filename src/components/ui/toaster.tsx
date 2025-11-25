// Safe Toaster replacement (no hooks) to avoid invalid hook calls if used anywhere
import React from "react";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport />
    </ToastProvider>
  );
}
