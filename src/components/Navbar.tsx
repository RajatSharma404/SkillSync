"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "./ThemeProvider";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/log", label: "Log Activity", icon: "✏️" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/insights", label: "Insights", icon: "🧠" },
  { href: "/reports", label: "Reports", icon: "📋" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  const isDark = theme === "dark";

  return (
    <nav
      style={{
        background: isDark
          ? "rgba(5, 5, 18, 0.88)"
          : "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: isDark
          ? "1px solid rgba(0, 212, 255, 0.1)"
          : "1px solid rgba(0, 153, 204, 0.15)",
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.svg"
          alt="SkillSync"
          style={{ width: 24, height: 24 }}
        />
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
                color: active ? "#00b4d8" : isDark ? "#6b80a0" : "#475569",
                background: active
                  ? isDark
                    ? "rgba(0, 212, 255, 0.1)"
                    : "rgba(0, 153, 204, 0.08)"
                  : "transparent",
                border: active
                  ? isDark
                    ? "1px solid rgba(0, 212, 255, 0.2)"
                    : "1px solid rgba(0, 153, 204, 0.25)"
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

      {/* User + theme toggle + sign out */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            background: "transparent",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.12)"
              : "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: "8px",
            color: isDark ? "#a0aec0" : "#475569",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
            flexShrink: 0,
          }}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

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
            color: isDark ? "#6b80a0" : "#64748b",
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
