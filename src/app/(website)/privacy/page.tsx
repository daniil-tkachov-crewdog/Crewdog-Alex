import { LegalPage } from "@/website/components/legal-page";

export const metadata = { title: "Privacy Policy — Crewdog Alex" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="—">
      <p>
        <strong>Placeholder content.</strong> This page will hold Crewdog Alex&apos;s
        real privacy policy before launch. The text below is a structural
        stand-in.
      </p>
      <h2>What we collect</h2>
      <p>
        Account details from job boards that sign up, the job data they import,
        and anonymized usage of the Alex assistant.
      </p>
      <h2>How we use it</h2>
      <p>
        To operate the assistant, power search over a board&apos;s listings, and
        bill for the service.
      </p>
      <h2>Data isolation</h2>
      <p>
        Each board&apos;s data is scoped to that board and is never shared with or
        exposed to another tenant.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about privacy? See <a href="/contact">Contact Us</a>.
      </p>
    </LegalPage>
  );
}
