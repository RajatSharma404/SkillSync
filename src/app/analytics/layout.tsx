import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <Navbar />
      <main
        style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        {children}
      </main>
    </>
  );
}
