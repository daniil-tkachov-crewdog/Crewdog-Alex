import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "FAQ — Crewdog Alex" };

const faqs = [
  {
    q: "What is Crewdog Alex?",
    a: "A white-labeled AI assistant your job board embeds on its site. Candidates find roles by chatting with Alex instead of scrolling through listings.",
  },
  {
    q: "How do candidates use it?",
    a: "A floating icon opens a chat. Alex asks about title, location, salary and remote preference, then searches your live jobs and replies with matching links.",
  },
  {
    q: "How do I add it to my site?",
    a: "Set up your branding, connect your jobs, copy your unique one-line script into your site, and press Start.",
  },
  {
    q: "How do I get my jobs into Alex?",
    a: "Upload a CSV today. Feed-URL auto-sync and scraping are on the way.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Each board's data is isolated — one board can never see another's jobs or candidates.",
  },
  {
    q: "How much does it cost?",
    a: "Monthly plans (currently placeholder pricing). See the pricing section on the home page.",
  },
];

export default function FaqPage() {
  return (
    <LegalPage title="Frequently asked questions">
      <div className="flex flex-col gap-6">
        {faqs.map((f) => (
          <div key={f.q}>
            <h2>{f.q}</h2>
            <p className="mt-1">{f.a}</p>
          </div>
        ))}
      </div>
    </LegalPage>
  );
}
