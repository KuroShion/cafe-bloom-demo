import { useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "../lib/store";
import { Button, Input } from "../components/ui";

export default function Login({
  cafeName,
  ownerName,
  onLogin,
  onReset,
}: {
  cafeName: string;
  ownerName: string;
  onLogin: (s: Session) => void;
  onReset: () => void;
}) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const guest = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Please enter your name to order as a guest.");
      return;
    }
    setErr("");
    onLogin({ role: "guest", name: name.trim() });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="rise w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-2xl">
          <div className="bg-gradient-to-br from-accent/25 via-panel to-terracotta/20 p-6">
            <div className="floaty text-center text-5xl">🌸</div>
            <h1 className="mt-3 text-center font-display text-3xl font-bold">{cafeName}</h1>
            <p className="mt-1 text-center text-sm text-muted">
              Warm coffee, fresh bakes &amp; honest food. A concept demo of our café ordering and management system.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <Button className="w-full" onClick={() => onLogin({ role: "owner", name: ownerName })}>
              ☕ Owner Console
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <div className="h-px flex-1 bg-line" />
              or order as a guest
              <div className="h-px flex-1 bg-line" />
            </div>
            <form onSubmit={guest} className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (e.g. Lily Tan)"
                maxLength={40}
              />
              {err && <p className="text-xs text-danger">{err}</p>}
              <Button type="submit" variant="outline" className="w-full">
                🍽️ Enter as Guest
              </Button>
            </form>
            <p className="rounded-lg border border-line bg-panel-2 p-2 text-center text-[11px] text-muted">
              Concept demo with sample data. Owner view lets you manage orders, menu, tables, inventory and staff.
            </p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <button onClick={onReset} className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline">
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}