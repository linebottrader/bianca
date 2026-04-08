import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type StoreStatusResult = {
  isOpen: boolean;
  isPaused: boolean;
  statusMessage: string;
  countdownText: string;
  /** "open" | "closed" | "paused" | "override_open" | "override_closed" */
  reason: string;
};

type StoreHourRow = { day_of_week: number; is_open: boolean; open_time: string; close_time: string };
type SpecialDateRow = { date: string; is_open: boolean; open_time: string | null; close_time: string | null; description: string };
type HolidayRow = { date: string; name: string; is_open: boolean; open_time: string | null; close_time: string | null };
type PauseRow = { is_active: boolean; start_time: string | null; end_time: string | null; reason: string };
type OverrideRow = { is_active: boolean; force_status: boolean };

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isWithinTimeRange(nowMin: number, openMin: number, closeMin: number): boolean {
  // midnight = 0
  let close = closeMin;
  if (close === 0) close = 1440;
  // crossing midnight
  if (close <= openMin) {
    return nowMin >= openMin || nowMin < close;
  }
  return nowMin >= openMin && nowMin < close;
}

function formatTimeStr(t: string): string {
  const [h, m] = t.split(":");
  return `${(h || "00").padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "";
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h > 0) return `em ${String(h).padStart(2, "0")}h ${String(min).padStart(2, "0")}min`;
  return `em ${min}min`;
}

export function useStoreStatus(): StoreStatusResult {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const { data: hours } = useQuery({
    queryKey: ["store-hours"],
    queryFn: async () => {
      const { data } = await supabase.from("store_hours").select("*").order("day_of_week");
      return (data || []) as StoreHourRow[];
    },
    staleTime: 300000,
  });

  const { data: specialDates } = useQuery({
    queryKey: ["special-dates"],
    queryFn: async () => {
      const { data } = await supabase.from("special_dates").select("*");
      return (data || []) as SpecialDateRow[];
    },
    staleTime: 300000,
  });

  const { data: holidays } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data } = await supabase.from("holidays").select("*");
      return (data || []) as HolidayRow[];
    },
    staleTime: 300000,
  });

  const { data: pause } = useQuery({
    queryKey: ["store-pause"],
    queryFn: async () => {
      const { data } = await supabase.from("store_pause").select("*").limit(1).single();
      return data as PauseRow | null;
    },
    staleTime: 30000,
  });

  const { data: override } = useQuery({
    queryKey: ["store-override"],
    queryFn: async () => {
      const { data } = await supabase.from("store_override").select("*").limit(1).single();
      return data as OverrideRow | null;
    },
    staleTime: 30000,
  });

  return useMemo(() => {
    const now = new Date();

    // 1. Override manual (highest priority)
    if (override?.is_active) {
      if (override.force_status) {
        return { isOpen: true, isPaused: false, statusMessage: "Loja aberta (modo manual)", countdownText: "", reason: "override_open" };
      }
      return { isOpen: false, isPaused: false, statusMessage: "Loja temporariamente indisponível", countdownText: "", reason: "override_closed" };
    }

    // 2. Pause
    if (pause?.is_active) {
      const endTime = pause.end_time ? new Date(pause.end_time) : null;
      if (endTime && now < endTime) {
        const diff = endTime.getTime() - now.getTime();
        const endStr = endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return {
          isOpen: false,
          isPaused: true,
          statusMessage: pause.reason || "Estamos temporariamente pausados",
          countdownText: `Voltamos às ${endStr} (${formatCountdown(diff)})`,
          reason: "paused",
        };
      } else if (!endTime) {
        return {
          isOpen: false,
          isPaused: true,
          statusMessage: pause.reason || "Estamos temporariamente pausados",
          countdownText: "",
          reason: "paused",
        };
      }
      // end_time passed — pause expired, fall through
    }

    const todayStr = now.toISOString().slice(0, 10);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();

    // helper to check time range and build messages
    const checkSchedule = (isOpen: boolean, openTime: string | null, closeTime: string | null, label: string): StoreStatusResult | null => {
      if (!isOpen) {
        return { isOpen: false, isPaused: false, statusMessage: label || "Hoje estamos fechados", countdownText: "", reason: "closed" };
      }
      if (openTime && closeTime) {
        const oMin = timeToMinutes(openTime);
        const cMin = timeToMinutes(closeTime);
        if (isWithinTimeRange(nowMin, oMin, cMin)) {
          return { isOpen: true, isPaused: false, statusMessage: "Estamos abertos! Faça seu pedido agora", countdownText: "", reason: "open" };
        }
        // Closed, show when opens
        if (nowMin < oMin) {
          const diff = (oMin - nowMin) * 60000;
          return {
            isOpen: false, isPaused: false,
            statusMessage: `Abrimos hoje às ${formatTimeStr(openTime)}`,
            countdownText: formatCountdown(diff),
            reason: "closed",
          };
        }
        // Already past close
        return findNextOpening();
      }
      return null;
    };

    // Find next opening from weekly hours
    const findNextOpening = (): StoreStatusResult => {
      if (!hours?.length) {
        return { isOpen: false, isPaused: false, statusMessage: "Fechado", countdownText: "", reason: "closed" };
      }
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = new Date(now.getTime() + offset * 86400000);
        const dow = candidate.getDay();
        const h = hours.find((r) => r.day_of_week === dow);
        if (h?.is_open && h.open_time) {
          const openDate = new Date(candidate);
          const [oh, om] = h.open_time.split(":").map(Number);
          openDate.setHours(oh, om, 0, 0);
          const diff = openDate.getTime() - now.getTime();
          const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
          return {
            isOpen: false, isPaused: false,
            statusMessage: `Voltamos ${dayNames[dow]} às ${formatTimeStr(h.open_time)}`,
            countdownText: formatCountdown(diff),
            reason: "closed",
          };
        }
      }
      return { isOpen: false, isPaused: false, statusMessage: "Fechado", countdownText: "", reason: "closed" };
    };

    // 3. Special dates
    if (specialDates?.length) {
      const special = specialDates.find((s) => s.date === todayStr);
      if (special) {
        const r = checkSchedule(special.is_open, special.open_time, special.close_time, special.description || "Data especial — fechado");
        if (r) return r;
      }
    }

    // 4. Holidays
    if (holidays?.length) {
      const holiday = holidays.find((h) => h.date === todayStr);
      if (holiday) {
        const r = checkSchedule(holiday.is_open, holiday.open_time, holiday.close_time, `${holiday.name} — fechado`);
        if (r) return r;
      }
    }

    // 5. Weekly hours
    if (hours?.length) {
      const todayHours = hours.find((h) => h.day_of_week === dayOfWeek);
      if (todayHours) {
        const r = checkSchedule(todayHours.is_open, todayHours.open_time, todayHours.close_time, "Hoje estamos fechados");
        if (r) return r;
      }
    }

    // No rules configured — assume open
    return { isOpen: true, isPaused: false, statusMessage: "", countdownText: "", reason: "open" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, specialDates, holidays, pause, override, tick]);
}
