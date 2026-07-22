import { useState } from "react";

type CodeBlockProps = {
  label: string;
  code: string;
  language?: string;
};

export function CodeBlock({ label, code, language: _language = "text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="code-block">
      <div className="card-heading">
        <h3>{label}</h3>
        <button className="ghost-button" type="button" onClick={copy} aria-label={`Copy ${label} code`}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code aria-label={label}>{code}</code>
      </pre>
    </div>
  );
}
