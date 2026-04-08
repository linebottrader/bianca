import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useStoreData";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, FolderOpen, Eye, EyeOff } from "lucide-react";
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

const AdminCategories = () => {
  const { data: categories, isLoading } = useCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingVisId, setTogglingVisId] = useState<string | null>(null);
  const [togglingDispId, setTogglingDispId] = useState<string | null>(null);

  const reorder = useBatchReorder("categories", [
    ["categories"],
    ["menu-items"],
    ["all-menu-items"],
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(categories, oldIndex, newIndex);
    // Optimistic update
    queryClient.setQueryData(["categories"], newOrder);
    reorder(newOrder.map((c) => c.id));
  };

  const handleToggleDisponivel = async (cat: { id: string; disponivel: boolean }) => {
    setTogglingDispId(cat.id);
    try {
      const { error } = await supabase.from("categories").update({ disponivel: !cat.disponivel }).eq("id", cat.id);
      if (error) throw error;
      invalidate();
    } catch (err: any) {
      logAndToast(err, "Alterar disponibilidade da categoria", toast);
    } finally {
      setTogglingDispId(null);
    }
  };

  const handleToggleVisivel = async (cat: { id: string; visivel: boolean }) => {
    setTogglingVisId(cat.id);
    try {
      const { error } = await supabase.from("categories").update({ visivel: !cat.visivel }).eq("id", cat.id);
      if (error) throw error;
      invalidate();
    } catch (err: any) {
      logAndToast(err, "Alterar visibilidade da categoria", toast);
    } finally {
      setTogglingVisId(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      toast({ title: "Preencha nome e slug", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const maxOrder = Math.max(0, ...(categories?.map((c) => c.sort_order) || []));
      const { error } = await supabase.from("categories").insert({
        name: newName.trim(),
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
      setNewName("");
      setNewSlug("");
      invalidate();
      toast({ title: "Categoria criada!" });
    } catch (err: any) {
      logAndToast(err, "Criar categoria", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("categories").update({ name: editName, slug: editSlug }).eq("id", id);
      if (error) throw error;
      setEditingId(null);
      invalidate();
      toast({ title: "Categoria atualizada!" });
    } catch (err: any) {
      logAndToast(err, "Atualizar categoria", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta categoria? Todos os produtos dela serão removidos!")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      invalidate();
      toast({ title: "Categoria excluída!" });
    } catch (err: any) {
      logAndToast(err, "Excluir categoria", toast);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Nova Categoria</h3>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Nome</label>
            <Input value={newName} onChange={(e) => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Ex: Sobremesas" />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Slug</label>
            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="Ex: sobremesas" />
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            {saving ? "Criando..." : "Criar"}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Categorias ({categories?.length || 0})</h3>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={categories?.map((c) => c.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categories?.map((cat) => (
                <SortableItem
                  key={cat.id}
                  id={cat.id}
                  className={`rounded-lg bg-muted/50 p-3 ${!cat.visivel ? "opacity-50" : ""}`}
                >
                  {editingId === cat.id ? (
                    <div className="flex flex-1 gap-2 items-center">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                      <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="flex-1" />
                      <Button size="sm" onClick={() => handleUpdate(cat.id)} disabled={saving}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>✕</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="font-semibold text-sm">{cat.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({cat.slug})</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); }}>
                        Editar
                      </Button>
                      <button
                        onClick={() => handleToggleDisponivel(cat)}
                        disabled={togglingDispId === cat.id}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                          cat.disponivel !== false
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                        }`}
                        title={cat.disponivel !== false ? "Marcar como indisponível" : "Marcar como disponível"}
                      >
                        {cat.disponivel !== false ? "Disponível" : "Indisponível"}
                      </button>
                      <button
                        onClick={() => handleToggleVisivel(cat)}
                        disabled={togglingVisId === cat.id}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition"
                        title={cat.visivel !== false ? "Ocultar categoria" : "Mostrar categoria"}
                      >
                        {cat.visivel !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(cat.id)} disabled={deletingId === cat.id} className="text-muted-foreground hover:text-destructive disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default AdminCategories;
