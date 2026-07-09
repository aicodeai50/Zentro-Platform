import { useMemo, useState } from "react";
import { Copy, Play } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { models } from "../data/mockData";

const initialPrompt = "Write a concise launch checklist for a developer API platform.";

export function Playground() {
  const [model, setModel] = useState("Zentro Fast");
  const [systemPrompt, setSystemPrompt] = useState("You are a practical developer platform assistant.");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(800);
  const [response, setResponse] = useState(
    "Mock response: define API key scopes, publish quickstart docs, configure usage alerts, verify billing events, and run rate-limit tests."
  );

  const curlExample = useMemo(
    () => `curl https://api.zentro.dev/v1/chat/completions \\
  -H "Authorization: Bearer $ZENTRO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.toLowerCase().replaceAll(" ", "-")}",
    "messages": [
      { "role": "system", "content": "${systemPrompt}" },
      { "role": "user", "content": "${prompt}" }
    ],
    "temperature": ${temperature},
    "max_tokens": ${maxTokens}
  }'`,
    [maxTokens, model, prompt, systemPrompt, temperature]
  );

  function runMockPrompt() {
    setResponse(
      `Mock response from ${model}: start with authentication, validate the request contract, instrument usage, document errors, and invite a teammate to review production access.`
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Playground"
        title="Experiment with prompts"
        description="Tune parameters and preview request payloads before wiring up live model calls."
      />

      <div className="playground-grid">
        <Card>
          <div className="form-grid">
            <label>
              Model
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {models.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              System prompt
              <textarea
                rows={3}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
              />
            </label>
            <label>
              Prompt
              <textarea rows={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </label>
            <div className="slider-row">
              <label>
                Temperature
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(event) => setTemperature(Number(event.target.value))}
                />
                <span>{temperature.toFixed(1)}</span>
              </label>
              <label>
                Max tokens
                <input
                  type="number"
                  min="1"
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(Number(event.target.value))}
                />
              </label>
            </div>
            <button className="primary-button" type="button" onClick={runMockPrompt}>
              <Play size={16} />
              Run mock prompt
            </button>
          </div>
        </Card>

        <div className="stack-list">
          <Card>
            <div className="card-heading">
              <h2>Mock response</h2>
              <span>No backend call</span>
            </div>
            <p className="mock-response">{response}</p>
          </Card>
          <Card>
            <div className="card-heading">
              <h2>cURL example</h2>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void navigator.clipboard?.writeText(curlExample)}
              >
                <Copy size={15} />
                Copy
              </button>
            </div>
            <pre>
              <code>{curlExample}</code>
            </pre>
          </Card>
        </div>
      </div>
    </>
  );
}
