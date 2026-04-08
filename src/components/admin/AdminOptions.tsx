import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionGroups, useProductOptionGroups, useAllMenuItems, DBOptionGroup, DBOptionItem } from "@/hooks/useStoreData";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Settings2, ChevronDown, ChevronRight, Upload, Link2, Save } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";
import { useBatchReorder } from "@/hooks/useBatchReorder";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortableItem from "./SortableItem";

// Local edit state for a group
type GroupEdits = {
  nome?: string;
  descricao?: string;
  min_selecao?: number;
  max_selecao?: number;
  obrigatorio?: boolean;
};

// Local edit state for an item
type ItemEdits = {
  name?: string;
  descricao?: string;
  price?: number;
};

const AdminOptions = () => {
  const { data: groups, isLoading } = useOptionGroups();
  const { data: productLinks } = useProductOptionGroups();
  const { data: allItems } = useAllMenuItems();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Local edits tracking — only dirty fields are stored
  const [groupEdits, setGroupEdits] = useState<Record<string, GroupEdits>>({});
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdits>>({});

  const reorderGroups = useBatchReorder("option_groups", [["option-groups"]]);
  const reorderItems = useBatchReorder("option_items", [["option-groups"]]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["option-groups"] });
  };

  // ---- Group edits ----
  const updateGroupEdit = (id: string, field: keyof GroupEdits, value: any) => {
    setGroupEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getGroupValue = <K extends keyof GroupEdits>(group: DBOptionGroup, field: K): GroupEdits[K] => {
    return groupEdits[group.id]?.[field] ?? (group as any)[field];
  };

  const hasGroupChanges = (id: string) => {
    const edits = groupEdits[id];
    return edits && Object.keys(edits).length > 0;
  };

  const saveGroup = async (id: string) => {
    const edits = groupEdits[id];
    if (!edits || Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("option_groups").update(edits).eq("id", id);
      if (error) throw error;
      // Clear local edits and update cache optimistically
      setGroupEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.map((g) => (g.id === id ? { ...g, ...edits } : g));
      });
      toast({ title: "Grupo salvo!" });
    } catch (err: any) {
      logAndToast(err, "Salvar grupo", toast);
    } finally {
      setSaving(false);
    }
  };

  // ---- Item edits ----
  const updateItemEdit = (id: string, field: keyof ItemEdits, value: any) => {
    setItemEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getItemValue = <K extends keyof ItemEdits>(item: DBOptionItem, field: K): ItemEdits[K] => {
    return itemEdits[item.id]?.[field] ?? (item as any)[field];
  };

  const hasItemChanges = (id: string) => {
    const edits = itemEdits[id];
    return edits && Object.keys(edits).length > 0;
  };

  const saveItem = async (id: string) => {
    const edits = itemEdits[id];
    if (!edits || Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("option_items").update(edits).eq("id", id);
      if (error) throw error;
      setItemEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // Optimistic cache update
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.map((g) => ({
          ...g,
          items: g.items.map((i) => (i.id === id ? { ...i, ...edits } : i)),
        }));
      });
      toast({ title: "Item salvo!" });
    } catch (err: any) {
      logAndToast(err, "Salvar item", toast);
    } finally {
      setSaving(false);
    }
  };

  // ---- Drag & drop ----
  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !groups) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(groups, oldIndex, newIndex);
    queryClient.setQueryData(["option-groups"], newOrder);
    reorderGroups(newOrder.map((g) => g.id));
  };

  const handleItemDragEnd = (groupId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !groups) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const oldIndex = group.items.findIndex((i) => i.id === active.id);
    const newIndex = group.items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newItems = arrayMove(group.items, oldIndex, newIndex);
    queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
      if (!old) return old;
      return old.map((g) => (g.id === groupId ? { ...g, items: newItems } : g));
    });
    reorderItems(newItems.map((i) => i.id));
  };

  // ---- CRUD (single request each) ----
  const handleCreateGroup = async () => {
    setSaving(true);
    try {
      const maxOrder = Math.max(0, ...(groups?.map((g) => (g as any).sort_order ?? 0) || []));
      const { error } = await supabase.from("option_groups").insert({
        nome: "Novo grupo",
        obrigatorio: false,
        min_selecao: 0,
        max_selecao: 1,
        sort_order: maxOrder + 1,
      } as any);
      if (error) throw error;
      invalidate();
      toast({ title: "Grupo criado!" });
    } catch (err: any) {
      logAndToast(err, "Criar grupo", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGroupField = async (id: string, field: "ativo" | "obrigatorio", value: boolean) => {
    try {
      const { error } = await supabase.from("option_groups").update({ [field]: value }).eq("id", id);
      if (error) throw error;
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.map((g) => (g.id === id ? { ...g, [field]: value } : g));
      });
    } catch (err: any) {
      logAndToast(err, "Atualizar grupo", toast);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Excluir este grupo e todos os itens?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("option_groups").delete().eq("id", id);
      if (error) throw error;
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.filter((g) => g.id !== id);
      });
      toast({ title: "Grupo excluído!" });
    } catch (err: any) {
      logAndToast(err, "Excluir grupo", toast);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddItem = async (groupId: string) => {
    setSaving(true);
    try {
      const group = groups?.find((g) => g.id === groupId);
      const maxOrder = Math.max(0, ...(group?.items.map((i) => i.sort_order) || []));
      const { error } = await supabase.from("option_items").insert({ group_id: groupId, name: "Novo item", price: 0, sort_order: maxOrder + 1 } as any);
      if (error) throw error;
      invalidate();
    } catch (err: any) {
      logAndToast(err, "Adicionar item", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleItemActive = async (itemId: string, value: boolean) => {
    try {
      const { error } = await supabase.from("option_items").update({ ativo: value }).eq("id", itemId);
      if (error) throw error;
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.map((g) => ({
          ...g,
          items: g.items.map((i) => (i.id === itemId ? { ...i, ativo: value } : i)),
        }));
      });
    } catch (err: any) {
      logAndToast(err, "Atualizar item", toast);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      const { error } = await supabase.from("option_items").delete().eq("id", itemId);
      if (error) throw error;
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.map((g) => ({
          ...g,
          items: g.items.filter((i) => i.id !== itemId),
        }));
      });
      toast({ title: "Item excluído!" });
    } catch (err: any) {
      logAndToast(err, "Excluir item", toast);
    } finally {
      setDeletingId(null);
    }
  };

  const handleImageUpload = async (file: File, itemId: string) => {
    try {
      const ext = file.name.split(".").pop();
      const path = `option-item-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-images").getPublicUrl(path);
      const { error: updateErr } = await supabase.from("option_items").update({ imagem_url: data.publicUrl }).eq("id", itemId);
      if (updateErr) throw updateErr;
      queryClient.setQueryData(["option-groups"], (old: DBOptionGroup[] | undefined) => {
        if (!old) return old;
        return old.map((g) => ({
          ...g,
          items: g.items.map((i) => (i.id === itemId ? { ...i, imagem_url: data.publicUrl } : i)),
        }));
      });
    } catch (err: any) {
      logAndToast(err, "Enviar imagem", toast);
    }
  };

  const getLinkedProductCount = (groupId: string) =>
    (productLinks || []).filter((l) => l.group_id === groupId).length;

  const getLinkedProductNames = (groupId: string) => {
    const ids = (productLinks || []).filter((l) => l.group_id === groupId).map((l) => l.product_id);
    return (allItems || []).filter((i) => ids.includes(i.id)).map((i) => i.name);
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl tracking-wider">Grupos de Opções</h3>
          </div>
          <Button onClick={handleCreateGroup} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" /> {saving ? "Criando..." : "Novo Grupo"}
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie grupos reutilizáveis e vincule-os a múltiplos produtos na aba Produtos. Arraste para reordenar.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={groups?.map((g) => g.id) || []} strategy={verticalListSortingStrategy}>
          {(groups || []).map((group) => {
            const isExpanded = expandedGroup === group.id;
            const linkedCount = getLinkedProductCount(group.id);
            const groupDirty = hasGroupChanges(group.id);

            return (
              <SortableItem key={group.id} id={group.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition"
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{getGroupValue(group, "nome")}</span>
                      {(getGroupValue(group, "obrigatorio")) && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Obrigatório</span>
                      )}
                      <span className="text-xs text-muted-foreground">{group.items.length} itens</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">Seleção: {getGroupValue(group, "min_selecao")}–{getGroupValue(group, "max_selecao")}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> {linkedCount} produto{linkedCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={group.ativo}
                      onCheckedChange={(v) => handleToggleGroupField(group.id, "ativo", v)}
                    />
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={deletingId === group.id}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Group Settings — local state, save with button */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="text-xs font-medium">Nome do grupo</label>
                        <Input
                          value={getGroupValue(group, "nome") ?? ""}
                          onChange={(e) => updateGroupEdit(group.id, "nome", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Descrição</label>
                        <Input
                          value={getGroupValue(group, "descricao") ?? ""}
                          onChange={(e) => updateGroupEdit(group.id, "descricao", e.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Mín. seleção</label>
                        <Input
                          type="number"
                          min={0}
                          value={getGroupValue(group, "min_selecao") ?? 0}
                          onChange={(e) => updateGroupEdit(group.id, "min_selecao", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Máx. seleção</label>
                        <Input
                          type="number"
                          min={1}
                          value={getGroupValue(group, "max_selecao") ?? 1}
                          onChange={(e) => updateGroupEdit(group.id, "max_selecao", parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={getGroupValue(group, "obrigatorio") ?? false}
                          onCheckedChange={(v) => updateGroupEdit(group.id, "obrigatorio", v)}
                        />
                        <span className="text-sm">Obrigatório</span>
                      </div>
                      {groupDirty && (
                        <Button size="sm" onClick={() => saveGroup(group.id)} disabled={saving}>
                          <Save className="mr-1 h-3 w-3" /> Salvar Grupo
                        </Button>
                      )}
                    </div>

                    {linkedCount > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <span className="font-medium">Produtos vinculados:</span>{" "}
                        {getLinkedProductNames(group.id).join(", ")}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Itens do grupo</h4>
                        <Button size="sm" variant="outline" onClick={() => handleAddItem(group.id)} disabled={saving}>
                          <Plus className="mr-1 h-3 w-3" /> Adicionar Item
                        </Button>
                      </div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd(group.id)} modifiers={[restrictToVerticalAxis]}>
                        <SortableContext items={group.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                          {group.items.map((item) => {
                            const itemDirty = hasItemChanges(item.id);
                            return (
                              <SortableItem key={item.id} id={item.id} className="rounded-lg bg-muted/50 p-3">
                                <div className="flex items-center gap-2">
                                  {item.imagem_url ? (
                                    <img src={item.imagem_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                                  ) : (
                                    <label className="h-10 w-10 rounded bg-muted flex items-center justify-center cursor-pointer shrink-0 hover:bg-muted/80">
                                      <Upload className="h-4 w-4 text-muted-foreground" />
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], item.id)} />
                                    </label>
                                  )}
                                  <div className="flex-1 min-w-0 grid gap-1 sm:grid-cols-3">
                                    <Input
                                      value={getItemValue(item, "name") ?? ""}
                                      onChange={(e) => updateItemEdit(item.id, "name", e.target.value)}
                                      placeholder="Nome"
                                      className="text-sm"
                                    />
                                    <Input
                                      value={getItemValue(item, "descricao") ?? ""}
                                      onChange={(e) => updateItemEdit(item.id, "descricao", e.target.value)}
                                      placeholder="Descrição (opcional)"
                                      className="text-sm"
                                    />
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs shrink-0">R$</span>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={getItemValue(item, "price") ?? 0}
                                        onChange={(e) => updateItemEdit(item.id, "price", parseFloat(e.target.value) || 0)}
                                        className="text-sm w-20"
                                      />
                                    </div>
                                  </div>
                                  {itemDirty && (
                                    <Button size="sm" variant="outline" onClick={() => saveItem(item.id)} disabled={saving} className="h-8 text-xs">
                                      <Save className="mr-1 h-3 w-3" /> Salvar
                                    </Button>
                                  )}
                                  <Switch
                                    checked={item.ativo}
                                    onCheckedChange={(v) => handleToggleItemActive(item.id, v)}
                                  />
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    disabled={deletingId === item.id}
                                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </SortableItem>
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                )}
              </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default AdminOptions;
