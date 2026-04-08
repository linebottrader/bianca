import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, PartyPopper, Pause, Power, Save, Plus, Trash2, Loader2 } from "lucide-react";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type StoreHourRow = { id: string; day_of_week: number; is_open: boolean; open_time: string; close_time: string };
type SpecialDateRow = { id: string; date: string; is_open: boolean; open_time: string | null; close_time: string | null; description: string };
type HolidayRow = { id: string; date: string; name: string; is_open: boolean; open_time: string | null; close_time: string | null };
type PauseRow = { id: string; is_active: boolean; start_time: string | null; end_time: string | null; reason: string };
type OverrideRow = { id: string; is_active: boolean; force_status: boolean };

export default function AdminStoreHours() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState("");

  // ─── Queries ───
  const { data: hours = [] } = useQuery({
    queryKey: ["store-hours"],
    queryFn: async () => {
      const { data } = await supabase.from("store_hours").select("*").order("day_of_week");
      return (data || []) as StoreHourRow[];
    },
  });

  const { data: specialDates = [] } = useQuery({
    queryKey: ["special-dates"],
    queryFn: async () => {
      const { data } = await supabase.from("special_dates").select("*").order("date");
      return (data || []) as SpecialDateRow[];
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data } = await supabase.from("holidays").select("*").order("date");
      return (data || []) as HolidayRow[];
    },
  });

  const { data: pause } = useQuery({
    queryKey: ["store-pause"],
    queryFn: async () => {
      const { data } = await supabase.from("store_pause").select("*").limit(1).single();
      return data as PauseRow | null;
    },
  });

  const { data: override } = useQuery({
    queryKey: ["store-override"],
    queryFn: async () => {
      const { data } = await supabase.from("store_override").select("*").limit(1).single();
      return data as OverrideRow | null;
    },
  });

  // ─── Local State ───
  const [localHours, setLocalHours] = useState<StoreHourRow[]>([]);
  const [newSpecial, setNewSpecial] = useState({ date: "", is_open: false, open_time: "18:00", close_time: "23:00", description: "" });
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "", is_open: false, open_time: "18:00", close_time: "23:00" });

  useEffect(() => { if (hours.length) setLocalHours(hours); }, [hours]);

  // ─── Pause countdown ───
  const [pauseCountdown, setPauseCountdown] = useState("");
  useEffect(() => {
    if (!pause?.is_active || !pause.end_time) { setPauseCountdown(""); return; }
    const update = () => {
      const diff = new Date(pause.end_time!).getTime() - Date.now();
      if (diff <= 0) { setPauseCountdown("Expirado"); return; }
      const m = Math.floor(diff / 60000);
      const h = Math.floor(m / 60);
      setPauseCountdown(h > 0 ? `${h}h ${m % 60}min restantes` : `${m}min restantes`);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [pause]);

  // ─── Handlers ───
  const saveHours = async () => {
    setSaving("hours");
    try {
      for (const h of localHours) {
        await supabase.from("store_hours").update({
          is_open: h.is_open,
          open_time: h.open_time,
          close_time: h.close_time,
        }).eq("id", h.id);
      }
      qc.invalidateQueries({ queryKey: ["store-hours"] });
      toast({ title: "Horários salvos!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving("");
  };

  const addSpecialDate = async () => {
    if (!newSpecial.date) return;
    setSaving("special");
    const { error } = await supabase.from("special_dates").insert({
      date: newSpecial.date,
      is_open: newSpecial.is_open,
      open_time: newSpecial.is_open ? newSpecial.open_time : null,
      close_time: newSpecial.is_open ? newSpecial.close_time : null,
      description: newSpecial.description,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      qc.invalidateQueries({ queryKey: ["special-dates"] });
      setNewSpecial({ date: "", is_open: false, open_time: "18:00", close_time: "23:00", description: "" });
      toast({ title: "Data especial adicionada!" });
    }
    setSaving("");
  };

  const deleteSpecialDate = async (id: string) => {
    await supabase.from("special_dates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["special-dates"] });
  };

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) return;
    setSaving("holiday");
    const { error } = await supabase.from("holidays").insert({
      date: newHoliday.date,
      name: newHoliday.name,
      is_open: newHoliday.is_open,
      open_time: newHoliday.is_open ? newHoliday.open_time : null,
      close_time: newHoliday.is_open ? newHoliday.close_time : null,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      setNewHoliday({ date: "", name: "", is_open: false, open_time: "18:00", close_time: "23:00" });
      toast({ title: "Feriado adicionado!" });
    }
    setSaving("");
  };

  const deleteHoliday = async (id: string) => {
    await supabase.from("holidays").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["holidays"] });
  };

  const togglePause = async (duration?: number) => {
    if (!pause) return;
    setSaving("pause");
    const nowActive = pause.is_active;
    if (nowActive) {
      await supabase.from("store_pause").update({ is_active: false, start_time: null, end_time: null, reason: "" }).eq("id", pause.id);
    } else {
      const start = new Date();
      const end = duration ? new Date(start.getTime() + duration * 60000) : null;
      await supabase.from("store_pause").update({
        is_active: true,
        start_time: start.toISOString(),
        end_time: end?.toISOString() || null,
        reason: "Pausa temporária",
      }).eq("id", pause.id);
    }
    qc.invalidateQueries({ queryKey: ["store-pause"] });
    toast({ title: nowActive ? "Pausa desativada!" : "Loja pausada!" });
    setSaving("");
  };

  const toggleOverride = async (forceOpen: boolean) => {
    if (!override) return;
    setSaving("override");
    if (override.is_active && override.force_status === forceOpen) {
      await supabase.from("store_override").update({ is_active: false }).eq("id", override.id);
    } else {
      await supabase.from("store_override").update({ is_active: true, force_status: forceOpen }).eq("id", override.id);
    }
    qc.invalidateQueries({ queryKey: ["store-override"] });
    toast({ title: "Override atualizado!" });
    setSaving("");
  };

  const updateLocalHour = (idx: number, field: string, value: any) => {
    setLocalHours((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  return (
    <div className="space-y-6">
      {/* Priority info */}
      <Card className="p-4 border-primary/30 bg-primary/5">
        <p className="text-sm text-muted-foreground">
          <strong>Prioridade:</strong> Override Manual → Pausa → Datas Especiais → Feriados → Horário Semanal
        </p>
      </Card>

      {/* ─── 1. Override Manual ─── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Power className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Controle Manual</h3>
          {override?.is_active && (
            <Badge variant={override.force_status ? "default" : "destructive"} className="ml-auto">
              {override.force_status ? "Forçado ABERTO" : "Forçado FECHADO"}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={override?.is_active && override.force_status ? "default" : "outline"}
            onClick={() => toggleOverride(true)}
            disabled={saving === "override"}
            className="gap-1.5"
          >
            {saving === "override" && <Loader2 className="h-3 w-3 animate-spin" />}
            🟢 Forçar ABERTO
          </Button>
          <Button
            size="sm"
            variant={override?.is_active && !override.force_status ? "destructive" : "outline"}
            onClick={() => toggleOverride(false)}
            disabled={saving === "override"}
            className="gap-1.5"
          >
            🔴 Forçar FECHADO
          </Button>
          {override?.is_active && (
            <Button size="sm" variant="ghost" onClick={() => { supabase.from("store_override").update({ is_active: false }).eq("id", override.id).then(() => { qc.invalidateQueries({ queryKey: ["store-override"] }); }); }}>
              Desativar Override
            </Button>
          )}
        </div>
      </Card>

      {/* ─── 2. Pausa Temporária ─── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Pause className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-lg">Pausar Loja</h3>
          {pause?.is_active && (
            <Badge className="ml-auto bg-yellow-500 text-white">
              ⏸ PAUSADA {pauseCountdown && `— ${pauseCountdown}`}
            </Badge>
          )}
        </div>
        {pause?.is_active ? (
          <Button size="sm" variant="outline" onClick={() => togglePause()} disabled={saving === "pause"}>
            {saving === "pause" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Retomar Funcionamento
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => togglePause(30)} disabled={saving === "pause"}>30 min</Button>
            <Button size="sm" variant="outline" onClick={() => togglePause(60)} disabled={saving === "pause"}>1 hora</Button>
            <Button size="sm" variant="outline" onClick={() => togglePause(120)} disabled={saving === "pause"}>2 horas</Button>
            <Button size="sm" variant="outline" onClick={() => togglePause()} disabled={saving === "pause"}>Indefinido</Button>
          </div>
        )}
      </Card>

      {/* ─── 3. Horário Semanal ─── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Horário Semanal</h3>
        </div>
        <div className="space-y-3">
          {localHours.map((h, i) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-muted/30">
              <span className="w-24 font-medium text-sm">{DAY_NAMES[h.day_of_week]}</span>
              <Switch checked={h.is_open} onCheckedChange={(v) => updateLocalHour(i, "is_open", v)} />
              <span className={`text-xs ${h.is_open ? "text-green-600" : "text-red-500"}`}>
                {h.is_open ? "Aberto" : "Fechado"}
              </span>
              {h.is_open && (
                <>
                  <Input type="time" value={h.open_time?.slice(0, 5) || "18:00"} onChange={(e) => updateLocalHour(i, "open_time", e.target.value)} className="w-28 h-8 text-sm" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="time" value={h.close_time?.slice(0, 5) || "23:00"} onChange={(e) => updateLocalHour(i, "close_time", e.target.value)} className="w-28 h-8 text-sm" />
                </>
              )}
            </div>
          ))}
        </div>
        <Button onClick={saveHours} disabled={saving === "hours"} className="mt-4 gap-1.5" size="sm">
          {saving === "hours" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Horários
        </Button>
      </Card>

      {/* ─── 4. Datas Especiais ─── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Datas Especiais</h3>
        </div>
        {specialDates.length > 0 && (
          <div className="space-y-2 mb-4">
            {specialDates.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                <span className="font-mono">{s.date}</span>
                <Badge variant={s.is_open ? "default" : "destructive"} className="text-xs">{s.is_open ? "Aberto" : "Fechado"}</Badge>
                {s.is_open && s.open_time && <span className="text-xs text-muted-foreground">{s.open_time?.slice(0,5)} - {s.close_time?.slice(0,5)}</span>}
                <span className="text-xs text-muted-foreground flex-1">{s.description}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteSpecialDate(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-dashed border-border">
          <div>
            <label className="text-xs font-medium">Data</label>
            <Input type="date" value={newSpecial.date} onChange={(e) => setNewSpecial({ ...newSpecial, date: e.target.value })} className="h-8 w-36 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={newSpecial.is_open} onCheckedChange={(v) => setNewSpecial({ ...newSpecial, is_open: v })} />
            <span className="text-xs">{newSpecial.is_open ? "Aberto" : "Fechado"}</span>
          </div>
          {newSpecial.is_open && (
            <>
              <Input type="time" value={newSpecial.open_time} onChange={(e) => setNewSpecial({ ...newSpecial, open_time: e.target.value })} className="h-8 w-28 text-sm" />
              <Input type="time" value={newSpecial.close_time} onChange={(e) => setNewSpecial({ ...newSpecial, close_time: e.target.value })} className="h-8 w-28 text-sm" />
            </>
          )}
          <div className="flex-1 min-w-[120px]">
            <Input placeholder="Descrição" value={newSpecial.description} onChange={(e) => setNewSpecial({ ...newSpecial, description: e.target.value })} className="h-8 text-sm" />
          </div>
          <Button size="sm" onClick={addSpecialDate} disabled={saving === "special"} className="gap-1">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>
      </Card>

      {/* ─── 5. Feriados ─── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <PartyPopper className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Feriados</h3>
        </div>
        {holidays.length > 0 && (
          <div className="space-y-2 mb-4">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                <span className="font-mono">{h.date}</span>
                <span className="font-medium">{h.name}</span>
                <Badge variant={h.is_open ? "default" : "destructive"} className="text-xs">{h.is_open ? "Aberto" : "Fechado"}</Badge>
                {h.is_open && h.open_time && <span className="text-xs text-muted-foreground">{h.open_time?.slice(0,5)} - {h.close_time?.slice(0,5)}</span>}
                <span className="flex-1" />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteHoliday(h.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-dashed border-border">
          <div>
            <label className="text-xs font-medium">Data</label>
            <Input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} className="h-8 w-36 text-sm" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-medium">Nome</label>
            <Input placeholder="Ex: Natal" value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={newHoliday.is_open} onCheckedChange={(v) => setNewHoliday({ ...newHoliday, is_open: v })} />
            <span className="text-xs">{newHoliday.is_open ? "Aberto" : "Fechado"}</span>
          </div>
          {newHoliday.is_open && (
            <>
              <Input type="time" value={newHoliday.open_time} onChange={(e) => setNewHoliday({ ...newHoliday, open_time: e.target.value })} className="h-8 w-28 text-sm" />
              <Input type="time" value={newHoliday.close_time} onChange={(e) => setNewHoliday({ ...newHoliday, close_time: e.target.value })} className="h-8 w-28 text-sm" />
            </>
          )}
          <Button size="sm" onClick={addHoliday} disabled={saving === "holiday"} className="gap-1">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>
      </Card>
    </div>
  );
}
