import { LegalPage } from "@/website/components/legal-page";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export const metadata = { title: "Contact Us — Crewdog Alex" };

const CONTACT_EMAIL = "hello@crewdogalex.com"; // placeholder address

export default function ContactPage() {
  return (
    <LegalPage title="Contact Us">
      <p>
        Got a question about putting Alex on your job board, or need a hand with
        setup? We&apos;d love to hear from you.
      </p>
      <p>
        Email us and we&apos;ll get back to you. (A contact form lands once our email
        provider is wired up — for now this opens your mail app.)
      </p>
      <div className="pt-2">
        <Button asChild>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Mail className="size-4" />
            {CONTACT_EMAIL}
          </a>
        </Button>
      </div>
    </LegalPage>
  );
}
