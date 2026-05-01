"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

export function SubmitButton({ 
  children, 
  showOverlay, 
  pendingText,
  ...props 
}: ButtonProps & { showOverlay?: boolean; pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <>
      {pending && showOverlay && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          {pendingText && <p className="mt-2 text-sm font-medium text-foreground">{pendingText}</p>}
        </div>
      )}
      <Button type="submit" disabled={pending || props.disabled} {...props}>
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {children}
      </Button>
    </>
  );
}
