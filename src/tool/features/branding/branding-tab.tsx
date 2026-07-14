"use client";

import { useRef, useState } from "react";
import { ImagePlus, Check } from "lucide-react";
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

/**
 * Branding tab. Local-state form seeded from the client config. "Save" is a
 * no-op stub for now (persistence lands with Supabase); it confirms visually.
 */
export function BrandingTab({ config }: { config: ClientConfig }) {
  const [assistantName, setAssistantName] = useState(
    config.branding.assistant_name
  );
  const [boardName, setBoardName] = useState(config.branding.board_name);
  const [instructions, setInstructions] = useState(
    config.branding.instructions ?? ""
  );
  const [logoName, setLogoName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    // TODO(phase-2): persist to Supabase, keyed by config.client_id.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <form onSubmit={onSave} className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assistant-name">
              How would your assistant be called?
            </Label>
            <Input
              id="assistant-name"
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
              accept="image/png"
              className="hidden"
              onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? null)}
            />
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground">
                <ImagePlus className="size-6" />
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Upload PNG
                </Button>
                <span className="text-xs text-muted-foreground">
                  {logoName ?? "Displayed on the floating chat button."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructions">Any specific instructions?</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Always be concise. Only recommend roles in the UK."
              className="min-h-28"
            />
            <p className="text-xs text-muted-foreground">
              Added to Alex&apos;s system prompt on the backend.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit">Save</Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-status-green">
                <Check className="size-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
