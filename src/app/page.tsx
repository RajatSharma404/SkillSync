import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await getAuthSession();
  if (session) redirect("/dashboard");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background:
          "linear-gradient(160deg, #05050e 0%, #090520 50%, #05050e 100%)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 640 }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            background: "linear-gradient(135deg, #00d4ff 0%, #ff1f7e 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1.25rem",
            lineHeight: 1.1,
          }}
        >
          SkillSync
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "#8aafc8",
            marginBottom: "0.75rem",
            lineHeight: 1.6,
          }}
        >
          Your personal performance scientist.
        </p>
        <p
          style={{
            fontSize: "1rem",
            color: "#6b7280",
            marginBottom: "2.5rem",
            lineHeight: 1.7,
          }}
        >
          Log habits across every life domain. Let AI surface the hidden
          correlations — like how your morning run makes you 40% more productive
          at coding.
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #00b8e6 0%, #7c2fff 100%)",
            color: "white",
            padding: "0.85rem 2.25rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
            boxShadow: "0 4px 24px rgba(0, 184, 230, 0.4)",
          }}
        >
          Get Started — It&apos;s Free
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          maxWidth: 900,
          width: "100%",
          marginTop: "5rem",
        }}
      >
        {[
          {
            icon: "📊",
            title: "Multi-Domain Tracking",
            desc: "Coding, fitness, reading, mood — all in one place.",
          },
          {
            icon: "🧠",
            title: "AI Pattern Discovery",
            desc: "Claude AI finds correlations invisible to the naked eye.",
          },
          {
            icon: "📋",
            title: "Weekly Intelligence Reports",
            desc: "Actionable insights every Sunday, backed by your data.",
          },
          {
            icon: "⏰",
            title: "Activity Optimization",
            desc: "Predict your optimal times for every type of work.",
          },
        ].map((f) => (
          <div
            key={f.title}
            style={{
              background: "rgba(13, 13, 32, 0.85)",
              border: "1px solid rgba(0, 212, 255, 0.1)",
              borderRadius: "14px",
              padding: "1.5rem",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
              {f.icon}
            </div>
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              {f.title}
            </h3>
            <p
              style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6 }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
