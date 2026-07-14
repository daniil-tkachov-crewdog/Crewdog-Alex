import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Terms of Use — Crewdog Alex" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="—">
      <p>
        <strong>Placeholder content.</strong> Final terms of use will replace
        this before launch. The structure below is a stand-in.
      </p>
      <h2>Using the service</h2>
      <p>
        Crewdog Alex provides a white-labeled AI assistant that job boards embed
        on their sites. You&apos;re responsible for the job data you upload and for
        your candidates&apos; use of the assistant.
      </p>
      <h2>Subscriptions</h2>
      <p>
        Access is billed monthly. An active subscription keeps your assistant
        live; lapsed billing pauses it.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use the service to upload unlawful content or to attempt to access
        another tenant&apos;s data.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? See <a href="/contact">Contact Us</a>.
      </p>
    </LegalPage>
  );
}
