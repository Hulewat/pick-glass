"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pass }),
        });
        if (res.ok) window.location.href = params.get("next") || "/";
        else {
          setError((await res.json().catch(() => ({}))).error || "That passcode isn't right.");
          setBusy(false);
        }
      }}
    >
      <h1 className="title">Pick Glass</h1>
      <label htmlFor="pass" className="label">
        Studio passcode
      </label>
      <input id="pass" type="password" className="inline-input" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
      {error && <p className="body muted">{error}</p>}
      <div>
        <button type="submit" className="btn primary" disabled={busy || !pass}>
          Open
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="login">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
