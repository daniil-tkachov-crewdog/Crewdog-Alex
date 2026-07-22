import { LegalPage } from "@/website/components/legal-page";

export const metadata = { title: "Privacy Policy — Crewdog Alex" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="22 July 2026">
      <p>
        This Privacy Policy explains how Crewdog Alex (&quot;Crewdog Alex&quot;,
        &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) collects, uses, and
        protects personal data when you use our service (the
        &quot;Service&quot;). We process personal data in accordance with the UK
        General Data Protection Regulation (UK GDPR) and the Data Protection Act
        2018.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Crewdog Alex is the data controller for personal data about our account
        holders and for the operation of the Service. For personal data
        contained in the job listings and candidate conversations of a job board
        that uses the Service, that job board is the controller and we act as its
        processor. Our registered company details will be published here on
        incorporation; until then you can reach us at the contact below.
      </p>

      <h2>2. Data we collect</h2>
      <p>
        <strong>Account data:</strong> the name, company name, email address, and
        login details of the job boards that sign up.{" "}
        <strong>Customer Data:</strong> the job listings and related content our
        customers import. <strong>Candidate interactions:</strong> the messages
        candidates send to the Alex assistant and the responses generated.{" "}
        <strong>Usage data:</strong> technical and usage information such as token
        counts, request metadata, and basic logs used to operate and meter the
        Service.
      </p>

      <h2>3. How we use it and our lawful bases</h2>
      <p>
        We use personal data to provide, operate, secure, and improve the
        Service, to power search over a board&apos;s listings, to bill for the
        Service, and to provide support. Our lawful bases are: performance of our
        contract with you; our legitimate interests in running and improving the
        Service and keeping it secure; consent where required; and compliance
        with legal obligations.
      </p>

      <h2>4. Tenant isolation</h2>
      <p>
        Each customer&apos;s data is scoped to that customer and is never shared
        with, or exposed to, another tenant. Access controls and row-level
        security enforce this separation across the platform.
      </p>

      <h2>5. Sub-processors and international transfers</h2>
      <p>
        We use trusted third parties to run the Service, including Supabase (data
        hosting) and OpenAI (AI model processing). Some of these providers may
        process data outside the UK. Where they do, we rely on appropriate
        safeguards such as UK adequacy regulations or the International Data
        Transfer Agreement / Addendum to protect your data.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep personal data for as long as your account is active and as needed
        to provide the Service, then delete or anonymise it within a reasonable
        period, unless we must retain it longer to meet legal, accounting, or
        security obligations.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under UK GDPR you have the right to access, rectify, or erase your
        personal data; to restrict or object to processing; and to data
        portability. To exercise these rights, contact us using the details
        below. You also have the right to complain to the Information
        Commissioner&apos;s Office (ICO) at{" "}
        <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
          ico.org.uk
        </a>
        , though we&apos;d appreciate the chance to resolve your concern first.
        Candidates wishing to exercise rights over data held by a specific job
        board should contact that board, as it is the controller of that data.
      </p>

      <h2>8. Security</h2>
      <p>
        We use appropriate technical and organisational measures to protect
        personal data, including encryption in transit, access controls, and
        tenant isolation. No system is completely secure, but we work to protect
        your data and will notify affected parties and the ICO of a reportable
        breach as required by law.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use cookies and similar technologies that are necessary to keep you
        signed in and to operate the portal, together with limited analytics to
        understand and improve usage. You can control non-essential cookies
        through your browser settings.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will
        be reflected here with an updated date, and we will take reasonable steps
        to notify you where appropriate.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about privacy or to exercise your rights? Email{" "}
        <a href="mailto:hr@crewdog.co.uk">hr@crewdog.co.uk</a> or see{" "}
        <a href="/contact">Contact Us</a>.
      </p>
    </LegalPage>
  );
}
