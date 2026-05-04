"use client";

import { createRealtime, RealtimeProvider } from "@upstash/realtime/client";

import type { RealtimeEvents } from "@/lib/realtime";

export { RealtimeProvider };

export const { useRealtime } = createRealtime<RealtimeEvents>();
