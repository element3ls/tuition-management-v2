"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

export function SavingOverlayProvider() {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form?.hasAttribute("data-mutation-form")) return;
      setSaving(true);
    };
    const handlePageShow = () => setSaving(false);

    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  if (!saving) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm">
      <div className="grid min-w-56 place-items-center gap-3 rounded-lg border border-border/70 bg-card p-6 text-center shadow-lg">
        <LoaderCircle className="size-8 animate-spin text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Saving changes...</p>
          <p className="mt-1 text-xs text-muted-foreground">Please wait while the request completes.</p>
        </div>
      </div>
    </div>
  );
}
