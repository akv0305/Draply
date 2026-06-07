import SiteHeader from "@/components/customer/site-header";
import BottomNavServer from "@/components/customer/bottom-nav-server";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomNavServer />
    </div>
  );
}
