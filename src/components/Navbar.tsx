"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/log", label: "Log Activity", icon: "✏️" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/insights", label: "Insights", icon: "🧠" },
  { href: "/reports", label: "Reports", icon: "📋" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav
      style={{
        background: "rgba(5, 5, 18, 0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0, 212, 255, 0.1)",
        padding: "0 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>⚡</span>
        <span
          style={{
            fontWeight: 900,
            fontSize: "1rem",
            background: "linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.01em",
          }}
        >
          SkillSync
        </span>
      </Link>

      {/* Links */}
      <div style={{ display: "flex", gap: "0.2rem" }}>
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: active ? 600 : 400,
                color: active ? "#00d4ff" : "#6b80a0",
                background: active ? "rgba(0, 212, 255, 0.1)" : "transparent",
                border: active
                  ? "1px solid rgba(0, 212, 255, 0.2)"
                  : "1px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <span>{link.icon}</span>
              <span style={{ display: "none" }} className="sm-show">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User + sign out */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {session?.user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt="avatar"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid rgba(0, 212, 255, 0.3)",
            }}
          />
        )}
        <span
          style={{
            fontSize: "0.8rem",
            color: "#6b80a0",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {session?.user?.name ?? session?.user?.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            background: "transparent",
            border: "1px solid rgba(255, 31, 126, 0.3)",
            borderRadius: "6px",
            color: "#ff6b9d",
            padding: "0.3rem 0.65rem",
            fontSize: "0.75rem",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
