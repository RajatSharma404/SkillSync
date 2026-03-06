"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: email.trim(),
      name: name.trim(),
      redirect: false,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(160deg, #05050e 0%, #090520 50%, #05050e 100%)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "rgba(12, 12, 30, 0.9)",
          border: "1px solid rgba(0, 212, 255, 0.12)",
          borderRadius: "16px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span style={{ fontSize: "2rem" }}>⚡</span>
          <h1
            style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem" }}
          >
            Welcome to SkillSync
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginTop: "0.4rem",
            }}
          >
            Sign in to access your performance dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                color: "#a0a0b8",
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label
              style={{
                fontSize: "0.8rem",
                color: "#a0a0b8",
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {error && (
            <p
              style={{
                color: "#f87171",
                fontSize: "0.8rem",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem",
              fontSize: "0.95rem",
            }}
          >
            {loading ? "Signing in…" : "Sign In / Register"}
          </button>
        </form>

        <p
          style={{
            fontSize: "0.75rem",
            color: "#4b5563",
            marginTop: "1.5rem",
            textAlign: "center",
          }}
        >
          New users are automatically registered on first sign-in.
        </p>
      </div>
    </main>
  );
}
