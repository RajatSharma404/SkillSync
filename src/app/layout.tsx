import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import NotificationProvider from "@/components/NotificationProvider";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "SkillSync — Personal Growth Dashboard",
  description:
    "Track habits across every life domain. Let AI discover the hidden correlations that drive your peak performance.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on first load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('skillsync_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <NotificationProvider />
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
