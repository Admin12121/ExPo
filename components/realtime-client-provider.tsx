"use client";

import type React from "react";

import { RealtimeProvider } from "@/lib/realtime-client";

export function RealtimeClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider
      api={{
        url: process.env.NEXT_PUBLIC_REALTIME_URL ?? "/api/realtime",
        withCredentials: true,
      }}
    >
      {children}
    </RealtimeProvider>
  );
}
