import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllMenuItems, useCategories, DBMenuItem } from "@/hooks/useStoreData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Upload, Edit, X, Package, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";
import AdminMenuItemOptionGroups from "./AdminMenuItemOptionGroups";
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

const badgeOptions = [
  { value: "promo", label: "Promoção" },
  { value: "new", label: "Novidade" },
  { value: "best", label: "+ Vendido" },
];

const ProductForm = ({
  data,
  onChange,
  onImageUpload,
  categories,
  estacoes,
}: {
  data: any;
  onChange: (d: any) => void;
  onImageUpload: (file: File) => void;
  categories: { id: string; name: string }[] | undefined;
  estacoes: string[];
}) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <div>
      <label className="text-xs font-medium">Nome</label>
      <Input value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} />
    </div>
    <div>
      <label className="text-xs font-medium">Categoria</label>
      <select
        value={data.category_id}
        onChange={(e) => onChange({ ...data, category_id: e.target.value })}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Selecione...</option>
        {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
    <div className="sm:col-span-2">
      <label className="text-xs font-medium">Descrição</label>
      <textarea
        value={data.description}
        onChange={(e) => onChange({ ...data, description: e.target.value })}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
      />
    </div>
    <div>
      <label className="text-xs font-medium">Preço (R$)</label>
      <Input type="number" step="0.01" value={data.price} onChange={(e) => onChange({ ...data, price: e.target.value })} />
    </div>
    <div>
      <label className="text-xs font-medium">Preço Original (R$)</label>
      <Input type="number" step="0.01" value={data.original_price || ""} onChange={(e) => onChange({ ...data, original_price: e.target.value })} placeholder="Deixe vazio se não tem" />
    </div>
    <div>
      <label className="text-xs font-medium">Tempo Preparo (min)</label>
      <Input type="number" value={data.tempo_preparo || 10} onChange={(e) => onChange({ ...data, tempo_preparo: parseInt(e.target.value) || 10 })} />
    </div>
    <div>
      <label className="text-xs font-medium">Estação de Preparo</label>
      <select
        value={data.estacao_preparo || "Cozinha"}
        onChange={(e) => onChange({ ...data, estacao_preparo: e.target.value })}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {estacoes.map((e: string) => <option key={e} value={e}>{e}</option>)}
      </select>
    </div>
    <div>
      <label className="text-xs font-medium">URL da Imagem</label>
      <Input value={data.image_url || ""} onChange={(e) => onChange({ ...data, image_url: e.target.value })} placeholder="https://..." />
      <label className="mt-1 flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-primary">
        <Upload className="h-3 w-3" /> Ou enviar arquivo
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])} />
      </label>
    </div>
    <div>
      <label className="text-xs font-medium">Badges</label>
      <div className="flex gap-2 mt-1">
        {badgeOptions.map((b) => (
          <label key={b.value} className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={(data.badges || []).includes(b.value)}
              onChange={(e) => {
                const badges = data.badges || [];
                onChange({ ...data, badges: e.target.checked ? [...badges, b.value] : badges.filter((x: string) => x !== b.value) });
              }}
            />
            {b.label}
          </label>
        ))}
      </div>
    </div>
    {data.image_url && (
      <div className="sm:col-span-2">
        <img src={data.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" loading="lazy" decoding="async" width={64} height={64} />
      </div>
    )}
  </div>
);

const CategoryProductList = ({
  categoryId,
  categoryName,
  items,
  editingId,
  setEditingId,
  form,
  setForm,
  handleUpdate,
  handleDelete,
  handleImageUpload,
  toggleDisponivel,
  toggleVisivel,
  categories,
  estacoes,
  saving,
  deletingId,
  togglingId,
}: {
  categoryId: string;
  categoryName: string;
  items: DBMenuItem[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  form: any;
  setForm: (f: any) => void;
  handleUpdate: (id: string) => void;
  handleDelete: (id: string) => void;
  handleImageUpload: (file: File, cb: (url: string) => void) => void;
  toggleDisponivel: (item: DBMenuItem) => void;
  toggleVisivel: (item: DBMenuItem) => void;
  categories: { id: string; name: string }[] | undefined;
  estacoes: string[];
  saving: boolean;
  deletingId: string | null;
  togglingId: string | null;
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const queryClient = useQueryClient();
  const reorder = useBatchReorder("menu_items", [["menu-items"], ["all-menu-items"]]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(items, oldIndex, newIndex);
    // Optimistic: update all-menu-items cache
    queryClient.setQueryData(["all-menu-items"], (old: DBMenuItem[] | undefined) => {
      if (!old) return old;
      const otherItems = old.filter((i) => i.category_id !== categoryId);
      return [...otherItems, ...newOrder.map((item, idx) => ({ ...item, sort_order: idx }))];
    });
    reorder(newOrder.map((i) => i.id));
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border text-left hover:bg-muted/70 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        <Package className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm flex-1">{categoryName}</span>
        <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "produto" : "produtos"}</span>
      </button>
      {!collapsed && (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                className={`px-4 py-3 ${!item.visivel ? "opacity-50 bg-muted/20" : ""}`}
                disabled={editingId === item.id}
              >
                {editingId === item.id ? (
                  <div>
                    <ProductForm
                      data={form}
                      onChange={setForm}
                      onImageUpload={(file) => handleImageUpload(file, (url) => setForm((p: any) => ({ ...p, image_url: url })))}
                      categories={categories}
                      estacoes={estacoes}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                        Ativo
                      </label>
                      <div className="flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                      <Button size="sm" onClick={() => handleUpdate(item.id)} disabled={saving}>
                        <Save className="mr-1 h-3 w-3" /> Salvar
                      </Button>
                    </div>
                    <AdminMenuItemOptionGroups productId={item.id} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" loading="lazy" decoding="async" width={48} height={48} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{item.name}</span>
                        {!item.visivel && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Oculto</span>}
                        {!item.disponivel && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Indisponível</span>}
                      </div>
                      <span className="text-sm font-bold text-primary">R$ {item.price.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => toggleDisponivel(item)}
                      disabled={togglingId === item.id}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                        item.disponivel
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                      }`}
                    >
                      {item.disponivel ? "Disponível" : "Indisponível"}
                    </button>
                    <button
                      onClick={() => toggleVisivel(item)}
                      disabled={togglingId === item.id}
                      className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50 transition"
                    >
                      {item.visivel ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setForm({ ...item }); }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      )}
    </div>
  );
};

const AdminMenuItems = () => {
  const { data: items, isLoading: itemsLoading } = useAllMenuItems();
  const { data: categories } = useCategories();
  const { data: kdsConfig } = useQuery({
    queryKey: ["kds-config"],
    queryFn: async () => {
      const { data } = await supabase.from("kds_config").select("estacoes").limit(1).single();
      return data;
    },
  });
  const estacoes = kdsConfig?.estacoes?.length ? kdsConfig.estacoes : ["Cozinha"];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState<any>({ name: "", description: "", price: 0, original_price: "", image_url: "", category_id: "", badges: [], tempo_preparo: 10, estacao_preparo: "Cozinha" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const repairedIncompleteCacheRef = useRef(false);

  useEffect(() => {
    if (repairedIncompleteCacheRef.current || !items?.length) return;

    const hasIncompletePayload = items.some(
      (item: any) =>
        item?.image_url === undefined ||
        item?.description === undefined ||
        item?.original_price === undefined ||
        item?.badges === undefined ||
        item?.tempo_preparo === undefined ||
        item?.estacao_preparo === undefined
    );

    if (!hasIncompletePayload) return;

    repairedIncompleteCacheRef.current = true;
    queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
  }, [items, queryClient]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
  };

  const handleImageUpload = async (file: File, callback: (url: string) => void) => {
    try {
      const ext = file.name.split(".").pop();
      const path = `product-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-images").getPublicUrl(path);
      callback(data.publicUrl);
    } catch (err: any) {
      logAndToast(err, "Enviar imagem do produto", toast);
    }
  };

  const handleCreate = async () => {
    if (!newForm.name || !newForm.category_id) {
      toast({ title: "Preencha nome e categoria", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const maxOrder = Math.max(0, ...(items?.filter((i) => i.category_id === newForm.category_id).map((i) => i.sort_order) || []));
      const { error } = await supabase.from("menu_items").insert({
        name: newForm.name,
        description: newForm.description,
        price: parseFloat(newForm.price) || 0,
        original_price: newForm.original_price ? parseFloat(newForm.original_price) : null,
        image_url: newForm.image_url,
        category_id: newForm.category_id,
        badges: newForm.badges,
        sort_order: maxOrder + 1,
        tempo_preparo: newForm.tempo_preparo || 10,
        estacao_preparo: newForm.estacao_preparo || "Cozinha",
      });
      if (error) throw error;
      setCreating(false);
      setNewForm({ name: "", description: "", price: 0, original_price: "", image_url: "", category_id: "", badges: [], tempo_preparo: 10, estacao_preparo: "Cozinha" });
      invalidate();
      toast({ title: "Produto criado!" });
    } catch (err: any) {
      logAndToast(err, "Criar produto", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_items").update({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        image_url: form.image_url,
        category_id: form.category_id,
        badges: form.badges,
        is_active: form.is_active,
        tempo_preparo: form.tempo_preparo || 10,
        estacao_preparo: form.estacao_preparo || "Cozinha",
      }).eq("id", id);
      if (error) throw error;
      setEditingId(null);
      invalidate();
      toast({ title: "Produto atualizado!" });
    } catch (err: any) {
      logAndToast(err, "Atualizar produto", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
      invalidate();
      toast({ title: "Produto excluído!" });
    } catch (err: any) {
      logAndToast(err, "Excluir produto", toast);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleDisponivel = async (item: DBMenuItem) => {
    setTogglingId(item.id);
    try {
      const { error } = await supabase.from("menu_items").update({ disponivel: !item.disponivel }).eq("id", item.id);
      if (error) throw error;
      invalidate();
    } catch (err: any) {
      logAndToast(err, "Alterar disponibilidade", toast);
    } finally {
      setTogglingId(null);
    }
  };

  const toggleVisivel = async (item: DBMenuItem) => {
    setTogglingId(item.id);
    try {
      const { error } = await supabase.from("menu_items").update({ visivel: !item.visivel }).eq("id", item.id);
      if (error) throw error;
      invalidate();
    } catch (err: any) {
      logAndToast(err, "Alterar visibilidade", toast);
    } finally {
      setTogglingId(null);
    }
  };

  if (itemsLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  const groupedByCategory = categories?.map((cat) => ({
    ...cat,
    items: (items || []).filter((i) => i.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order),
  })).filter((g) => g.items.length > 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <Button onClick={() => setCreating(!creating)} variant={creating ? "secondary" : "default"}>
          {creating ? <><X className="mr-1 h-4 w-4" /> Cancelar</> : <><Plus className="mr-1 h-4 w-4" /> Novo Produto</>}
        </Button>
      </div>

      {creating && (
        <div className="rounded-xl border border-primary/30 bg-card p-5">
          <h3 className="font-display text-xl tracking-wider mb-3">Novo Produto</h3>
          <ProductForm
            data={newForm}
            onChange={setNewForm}
            onImageUpload={(file) => handleImageUpload(file, (url) => setNewForm((p: any) => ({ ...p, image_url: url })))}
            categories={categories}
            estacoes={estacoes}
          />
          <Button onClick={handleCreate} disabled={saving} className="mt-4">
            <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Criar Produto"}
          </Button>
        </div>
      )}

      {groupedByCategory.map((group) => (
        <CategoryProductList
          key={group.id}
          categoryId={group.id}
          categoryName={group.name}
          items={group.items}
          editingId={editingId}
          setEditingId={setEditingId}
          form={form}
          setForm={setForm}
          handleUpdate={handleUpdate}
          handleDelete={handleDelete}
          handleImageUpload={handleImageUpload}
          toggleDisponivel={toggleDisponivel}
          toggleVisivel={toggleVisivel}
          categories={categories}
          estacoes={estacoes}
          saving={saving}
          deletingId={deletingId}
          togglingId={togglingId}
        />
      ))}

      {groupedByCategory.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">Nenhum produto cadastrado.</p>
      )}
    </div>
  );
};

export default AdminMenuItems;
