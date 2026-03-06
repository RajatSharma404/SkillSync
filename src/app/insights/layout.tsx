import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export default async function AppPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "#05050e" }}>
      <Navbar />
      <main
        style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        {children}
      </main>
    </div>
  );
}
