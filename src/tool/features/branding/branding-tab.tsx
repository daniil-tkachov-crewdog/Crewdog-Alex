"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, Check, Loader2 } from "lucide-react";
import type { ClientConfig } from "@/shared/client-id";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBranding, type BrandingResult } from "./actions";

/**
 * Branding tab. Controlled form that persists to Supabase via `saveBranding`:
 * assistant name, board name, custom instructions, and an optional PNG logo
 * (shown live, then on the widget button + chat header once saved).
 */
export function BrandingTab({ config }: { config: ClientConfig }) {
  const [assistantName, setAssistantName] = useState(
    config.branding.assistant_name
  );
  const [boardName, setBoardName] = useState(config.branding.board_name);
  const [instructions, setInstructions] = useState(
    config.branding.instructions ?? ""
  );
  // Logo preview: a freshly-picked file (object URL) or the saved logo.
  const [preview, setPreview] = useState<string | null>(
    config.branding.logo_url
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<
    BrandingResult | null,
    FormData
  >(async (_prev, formData) => saveBranding(formData), null);

  // Revoke the object URL we created for the preview when it changes/unmounts.
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPickFile(file: File | null) {
    if (!file) return;
    setPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          How Alex presents itself on your job board.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assistant-name">
              What would your assistant be called?
            </Label>
            <Input
              id="assistant-name"
              name="assistant_name"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              placeholder="Alex"
            />
            <p className="text-xs text-muted-foreground">
              The name your candidates see in the chat.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="board-name">What&apos;s your job board&apos;s name?</Label>
            <Input
              id="board-name"
              name="board_name"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Acme Jobs"
            />
            <p className="text-xs text-muted-foreground">
              Pre-filled from your company name. Alex refers to this.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Your chatbot logo</Label>
            <input
              ref={fileRef}
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40 text-muted-foreground">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Logo preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImagePlus className="size-6" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Upload logo
                </Button>
                <span className="text-xs text-muted-foreground">
                  PNG recommended. Shown on the floating chat button.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructions">Any specific instructions?</Label>
            <Textarea
              id="instructions"
              name="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Always be concise. Only recommend roles in the UK."
              className="min-h-28"
            />
            <p className="text-xs text-muted-foreground">
              Added to Alex&apos;s system prompt as a secondary guideline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
            {state?.ok && (
              <span className="inline-flex items-center gap-1.5 text-sm text-status-green">
                <Check className="size-4" /> Saved
              </span>
            )}
            {state && !state.ok && (
              <span className="text-sm text-destructive">{state.error}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
