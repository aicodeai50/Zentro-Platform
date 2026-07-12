import type { ReactNode } from "react";
import { useState } from "react";
import { Card } from "../ui/Card";
import { useAppSession } from "../../lib/appSession";

export function AuthGate({ children }: { children: ReactNode }) {
  const { authStatus, signInWithEmail } = useAppSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (authStatus === "loading") {
    return (
      <main className="auth-shell">
        <Card>
          <p className="muted-text">Restoring secure session...</p>
        </Card>
      </main>
    );
  }

  if (authStatus === "supabase-not-configured") {
    return (
      <main className="auth-shell">
        <Card>
          <span className="eyebrow">Configuration required</span>
          <h1>Supabase login is not configured</h1>
          <p className="muted-text">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Service role keys and JWT secrets
            must never be exposed in the frontend.
          </p>
        </Card>
      </main>
    );
  }

  if (authStatus === "signed-out") {
    return (
      <main className="auth-shell">
        <Card className="auth-card">
          <span className="eyebrow">Zentro Platform</span>
          <h1>Sign in</h1>
          <p className="muted-text">Use your Supabase-backed Zentro account. The backend verifies every JWT.</p>
          <div className="form-grid">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button
              className="primary-button"
              type="button"
              onClick={async () => setMessage(await signInWithEmail(email, password))}
            >
              Login
            </button>
            {message ? <p className="muted-text">{message}</p> : null}
          </div>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
