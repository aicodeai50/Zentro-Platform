import { ArrowRight } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { docsSections } from "../data/mockData";

export function Docs() {
  return (
    <>
      <PageHeader
        eyebrow="Documentation"
        title="Build with Zentro"
        description="Quick references for authentication, chat completions, streaming, errors, and rate limits."
      />

      <div className="docs-layout">
        <Card className="docs-quickstart">
          <span className="eyebrow">Quickstart</span>
          <h2>Send your first request</h2>
          <pre>
            <code>{`curl https://api.zentro.dev/v1/chat/completions \\
  -H "Authorization: Bearer $ZENTRO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"zentro-fast","messages":[{"role":"user","content":"Hello"}]}'`}</code>
          </pre>
        </Card>

        <div className="docs-grid">
          {docsSections.map((section) => (
            <Card className="doc-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
              <button className="ghost-button" type="button">
                Read guide
                <ArrowRight size={15} />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
