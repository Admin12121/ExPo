import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/auth/session";

import { AppSidebar, SiteHeader } from "./_components";
import { ThemeProvider } from "@/components/theme-provider";
import { RealtimeClientProvider } from "@/components/realtime-client-provider";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession("/dashboard");

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RealtimeClientProvider>
        <SidebarProvider
          className="flex h-dvh min-h-0 overflow-hidden"
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 64)",
              "--header-height": "calc(var(--spacing) * 12 + 1px)",
            } as React.CSSProperties
          }
        >
          <AppSidebar
            variant="sidebar"
            user={{
              name: session.user.name,
              email: session.user.email,
              role: session.user.role ?? "user",
            }}
          />
          <SidebarInset className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <SiteHeader />
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </RealtimeClientProvider>
    </ThemeProvider>
  );
}
