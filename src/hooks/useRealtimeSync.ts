import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Realtime Sync — instant updates from Supabase postgres_changes.
 *
 * Uses refs instead of useCallback to avoid dependency chain instability
 * that was preventing the WebSocket from connecting.
 */

export type RealtimeStatus = "connected" | "disconnected";

let _realtimeStatus: RealtimeStatus = "disconnected";
const _statusListeners = new Set<(s: RealtimeStatus) => void>();

export function getRealtimeStatus(): RealtimeStatus {
  return _realtimeStatus;
}

export function onRealtimeStatusChange(cb: (s: RealtimeStatus) => void) {
  _statusListeners.add(cb);
  return () => { _statusListeners.delete(cb); };
}

function setRealtimeStatus(s: RealtimeStatus) {
  if (_realtimeStatus !== s) {
    _realtimeStatus = s;
    console.log(`[RealtimeSync] Status: ${s}`);
    _statusListeners.forEach((cb) => cb(s));
  }
}

// ── BroadcastChannel for multi-tab sync ──
let _bc: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!_bc) {
    try { _bc = new BroadcastChannel("realtime-sync"); } catch { return null; }
  }
  return _bc;
}

function broadcastUpdate(table: string) {
  getBroadcastChannel()?.postMessage({ table, ts: Date.now() });
}

// ── Dedup ──
const _lastEvents = new Map<string, number>();
function isDuplicate(table: string, eventType: string, id: string): boolean {
  const key = `${table}:${eventType}:${id}`;
  const now = Date.now();
  const last = _lastEvents.get(key);
  if (last && now - last < 200) return true;
  _lastEvents.set(key, now);
  if (_lastEvents.size > 100) {
    for (const [k, v] of _lastEvents) {
      if (now - v > 5000) _lastEvents.delete(k);
    }
  }
  return false;
}

// ── Invalidation map ──
const INVALIDATION_MAP: Record<string, { keys: string[][]; delay: number }> = {
  store_config: { keys: [["store-config"], ["store-config-lite"]], delay: 2000 },
  configuracao_pix: { keys: [["pix-config"]], delay: 2000 },
  configuracao_frete: { keys: [["frete-config"]], delay: 2000 },
  configuracoes_impressao: { keys: [["printer-config"]], delay: 2000 },
  kds_config: { keys: [["kds-config"]], delay: 2000 },
  categories: { keys: [["categories"], ["menu-items"], ["all-menu-items"]], delay: 500 },
  menu_items: { keys: [["menu-items"], ["all-menu-items"], ["premium-sections"]], delay: 500 },
  option_groups: { keys: [["option-groups"], ["menu-items"], ["all-menu-items"]], delay: 500 },
  option_items: { keys: [["option-groups"], ["menu-items"], ["all-menu-items"]], delay: 500 },
  product_option_groups: { keys: [["product-option-groups"], ["menu-items"], ["all-menu-items"]], delay: 500 },
  cupons: { keys: [["cupons"]], delay: 500 },
  cupons_aniversario: { keys: [["cupons-aniversario"]], delay: 500 },
  promocoes_config: { keys: [["promocoes-config"]], delay: 500 },
  menu_sections_premium: { keys: [["premium-sections"]], delay: 500 },
  menu_section_products: { keys: [["premium-sections"]], delay: 500 },
};

const BC_TABLE_TO_KEYS: Record<string, string[][]> = {
  menu_items: [["menu-items"], ["all-menu-items"], ["premium-sections"]],
  categories: [["categories"]],
  pedidos: [["admin-pedidos"], ["kds-pedidos"]],
  store_config: [["store-config"], ["store-config-lite"]],
  cupons: [["cupons"]],
  promocoes_config: [["promocoes-config"]],
  menu_sections_premium: [["premium-sections"]],
  menu_section_products: [["premium-sections"]],
};

const SUBSCRIBED_TABLES = [
  "store_config", "configuracao_pix", "configuracao_frete",
  "configuracoes_impressao", "kds_config",
  "categories", "menu_items",
  "option_groups", "option_items", "product_option_groups",
  "cupons", "cupons_aniversario", "promocoes_config",
  "menu_sections_premium", "menu_section_products",
];

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  // Single effect — no useCallback dependencies, no instability
  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const debouncedInvalidate = (keys: string[][], delay: number) => {
      const id = keys.map((k) => k.join("-")).join("|");
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => {
        console.log(`[RealtimeSync] Invalidando:`, keys.map(k => k.join("/")));
        keys.forEach((queryKey) => qcRef.current.invalidateQueries({ queryKey }));
        delete timers[id];
      }, delay);
    };

    const handleEvent = (table: string, payload: any) => {
      const { eventType, new: newData, old: oldData } = payload;
      const recordId = newData?.id || oldData?.id || "";
      if (isDuplicate(table, eventType, recordId)) return;

      console.log(`[RealtimeSync] ${eventType} → ${table}`);
      broadcastUpdate(table);

      const entry = INVALIDATION_MAP[table];
      if (entry) {
        debouncedInvalidate(entry.keys, entry.delay);
      }
    };

    const handlePedidos = (payload: any) => {
      const recordId = payload.new?.id || payload.old?.id || "";
      if (isDuplicate("pedidos", payload.eventType, recordId)) return;
      console.log(`[RealtimeSync] ${payload.eventType} → pedidos`);
      qcRef.current.invalidateQueries({ queryKey: ["admin-pedidos"] });
      qcRef.current.invalidateQueries({ queryKey: ["kds-pedidos"] });
      broadcastUpdate("pedidos");
    };

    const subscribe = () => {
      if (destroyed) return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      console.log("[RealtimeSync] Criando canal global...");

      let ch = supabase.channel("global-config-sync");

      SUBSCRIBED_TABLES.forEach((t) => {
        ch = ch.on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: t },
          (p: any) => handleEvent(t, p)
        );
      });

      ch = ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "pedidos" },
        handlePedidos
      );

      ch.subscribe((status: string, err?: Error) => {
        if (destroyed) return;
        if (status === "SUBSCRIBED") {
          console.log("[RealtimeSync] ✅ Realtime conectado");
          setRealtimeStatus("connected");
          reconnectAttempts = 0;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[RealtimeSync] ⚠️ Canal com problema:", status, err);
          setRealtimeStatus("disconnected");
          if (reconnectTimer) clearTimeout(reconnectTimer);
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;
          reconnectTimer = setTimeout(() => {
            if (!destroyed) {
              console.log(`[RealtimeSync] 🔄 Reconectando (tentativa ${reconnectAttempts})...`);
              subscribe();
            }
          }, delay);
        }
      });

      channel = ch;
    };

    // ── BroadcastChannel listener (other tabs) ──
    const bc = getBroadcastChannel();
    const bcHandler = (ev: MessageEvent) => {
      const { table } = ev.data || {};
      if (!table) return;
      const keys = BC_TABLE_TO_KEYS[table];
      if (keys) {
        keys.forEach((k) => qcRef.current.invalidateQueries({ queryKey: k }));
      }
    };
    bc?.addEventListener("message", bcHandler);

    // Start subscription
    subscribe();

    return () => {
      destroyed = true;
      Object.values(timers).forEach(clearTimeout);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) supabase.removeChannel(channel);
      bc?.removeEventListener("message", bcHandler);
    };
  }, []); // Empty deps — stable, runs once
}
