import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/auth/session";

import { AppSidebar } from "./_components/app-sidebar";
import { SiteHeader } from "./_components/site-header";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession("/dashboard");

  return (
    <SidebarProvider
      className="flex h-dvh min-h-0 overflow-hidden"
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role ?? "user",
        }}
      />
      <SidebarInset className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <SiteHeader />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
