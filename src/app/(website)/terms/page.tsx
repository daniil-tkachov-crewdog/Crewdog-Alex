import { LegalPage } from "@/website/components/legal-page";

export const metadata = { title: "Terms of Use — Crewdog Alex" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="22 July 2026">
      <p>
        These Terms of Use (&quot;Terms&quot;) govern your access to and use of
        the Crewdog Alex service (&quot;Crewdog Alex&quot;, the
        &quot;Service&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;).
        By creating an account, subscribing, or embedding the Service on your
        website, you agree to these Terms. If you are entering into these Terms
        on behalf of a company or other organisation, you confirm that you have
        authority to bind that organisation.
      </p>

      <h2>1. The Service</h2>
      <p>
        Crewdog Alex provides a white-labelled AI assistant (&quot;Alex&quot;)
        that job boards embed on their own sites to help candidates find roles.
        You configure the assistant, supply the job data it searches over, and
        are responsible for keeping that data accurate and lawful. We may update,
        improve, or change features of the Service from time to time.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate account information and keep your login
        credentials secure. You are responsible for all activity that occurs
        under your account. Notify us promptly at{" "}
        <a href="mailto:hr@crewdog.co.uk">hr@crewdog.co.uk</a> if you believe
        your account has been compromised.
      </p>

      <h2>3. Subscriptions and billing</h2>
      <p>
        Access to the Service is provided on a subscription basis and billed in
        advance for each billing period. An active subscription keeps your
        assistant live; if a payment fails or a subscription lapses, the
        assistant may be paused until billing is restored. Unless required by
        law, fees already paid are non-refundable. We will give reasonable notice
        of any change to our fees.
      </p>

      <h2>4. Your data and content</h2>
      <p>
        You retain ownership of the job listings and other content you upload
        (&quot;Customer Data&quot;). You grant us a licence to host, process, and
        display Customer Data solely to provide the Service. You are responsible
        for ensuring you have the rights to upload Customer Data and that it does
        not infringe any third party&apos;s rights or breach any law. Our handling
        of personal data is described in our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        You must not use the Service to: upload unlawful, infringing, or harmful
        content; attempt to access another tenant&apos;s data or our systems
        without authorisation; reverse engineer, disrupt, or overload the
        Service; or use it to send spam or to mislead candidates. We may suspend
        access where we reasonably believe these Terms have been breached.
      </p>

      <h2>6. AI-generated output</h2>
      <p>
        Alex uses third-party AI models to generate responses from your job data.
        Output may occasionally be inaccurate or incomplete and should not be
        relied on as professional advice. You are responsible for the way the
        assistant is presented to, and used by, your candidates.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Service, including its software, design, and branding (other than
        your Customer Data and your own trade marks), is owned by us or our
        licensors. Nothing in these Terms transfers those rights to you beyond
        the limited right to use the Service during your subscription.
      </p>

      <h2>8. Availability and warranties</h2>
      <p>
        We aim to keep the Service available and reliable but do not warrant that
        it will be uninterrupted or error-free. To the fullest extent permitted
        by law, the Service is provided &quot;as is&quot; and we exclude all
        implied warranties. Nothing in these Terms excludes liability that cannot
        lawfully be excluded, including for death or personal injury caused by
        negligence or for fraud.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        Subject to the paragraph above, we are not liable for loss of profits,
        revenue, goodwill, or data, or for any indirect or consequential loss.
        Our total liability arising out of or in connection with the Service in
        any 12-month period is limited to the fees you paid us for the Service in
        that period.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may cancel your subscription at any time; access continues until the
        end of the current billing period. We may suspend or terminate your
        access for material breach of these Terms. On termination, your right to
        use the Service ends and we may delete Customer Data in line with our
        Privacy Policy.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes
        we will take reasonable steps to notify you. Continued use of the Service
        after changes take effect constitutes acceptance of the updated Terms.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms and any dispute arising out of them are governed by the laws
        of England and Wales, and the courts of England and Wales have exclusive
        jurisdiction.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:hr@crewdog.co.uk">hr@crewdog.co.uk</a> or see{" "}
        <a href="/contact">Contact Us</a>.
      </p>
    </LegalPage>
  );
}
