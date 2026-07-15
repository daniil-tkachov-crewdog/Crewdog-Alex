"use client";

import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/admin/data";
import { formatDateTime } from "@/admin/format";

export function TicketsTab({ tickets }: { tickets: SupportTicket[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support tickets</CardTitle>
        <CardDescription>
          Messages from the Contact Us flow. {tickets.length} ticket
          {tickets.length === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No support tickets yet.
                </TableCell>
              </TableRow>
            )}
            {tickets.map((t) => {
              const isOpen = openId === t.id;
              return (
                <TicketRows
                  key={t.id}
                  ticket={t}
                  isOpen={isOpen}
                  onToggle={() => setOpenId(isOpen ? null : t.id)}
                />
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TicketRows({
  ticket,
  isOpen,
  onToggle,
}: {
  ticket: SupportTicket;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="font-medium">{ticket.email || "—"}</TableCell>
        <TableCell>{ticket.topic || "—"}</TableCell>
        <TableCell className="text-muted-foreground">
          {ticket.createdAt ? formatDateTime(ticket.createdAt) : "—"}
        </TableCell>
        <TableCell>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="bg-muted/30">
            <div className="flex flex-col gap-3 p-2">
              <p className="text-sm whitespace-pre-wrap break-words">
                {ticket.body || "(no message body)"}
              </p>
              <a
                href={`mailto:${ticket.email}?subject=Re: ${encodeURIComponent(
                  ticket.topic || "Your message to Crewdog Alex"
                )}`}
                className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="size-4" />
                Reply by email
              </a>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
