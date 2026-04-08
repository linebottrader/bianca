import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllMenuItems, useCategories } from "@/hooks/useStoreData";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Search, Eye, EyeOff, LayoutGrid, Columns3, Package, Pencil, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const badgeOptions = [
  { value: "promo", label: "Promoção" },
  { value: "new", label: "Novidade" },
  { value: "best", label: "+ Vendido" },
];
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

type PremiumSection = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  sort_order: number;
  auto_scroll: boolean;
  speed: number;
  product_image_size: string;
};

type SectionProduct = {
  id: string;
  section_id: string;
  product_id: string;
  position: number;
};

export default function AdminSectionsPremium() {
  const [sections, setSections] = useState<PremiumSection[]>([]);
  const [sectionProducts, setSectionProducts] = useState<SectionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<PremiumSection | null>(null);
  const [showProductPicker, setShowProductPicker] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showCreateProduct, setShowCreateProduct] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<any>({ name: "", description: "", price: "", original_price: "", image_url: "", category_id: "", badges: [], tempo_preparo: 10, estacao_preparo: "Cozinha" });
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: kdsConfig } = useQuery({
    queryKey: ["kds-config"],
    queryFn: async () => {
      const { data } = await supabase.from("kds_config").select("estacoes").limit(1).single();
      return data;
    },
  });
  const estacoes = kdsConfig?.estacoes?.length ? kdsConfig.estacoes : ["Cozinha"];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data: allProducts = [] } = useAllMenuItems();
  const { data: categories = [] } = useCategories();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [secRes, prodRes] = await Promise.all([
      supabase.from("menu_sections_premium").select("*").order("sort_order"),
      supabase.from("menu_section_products").select("*").order("position"),
    ]);
    if (secRes.data) setSections(secRes.data as PremiumSection[]);
    if (prodRes.data) setSectionProducts(prodRes.data as SectionProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createSection = async () => {
    const { error } = await supabase.from("menu_sections_premium").insert({
      name: "Nova Seção",
      sort_order: sections.length,
    });
    if (error) { toast.error("Erro ao criar seção"); return; }
    toast.success("Seção criada!");
    fetchData();
  };

  const updateSection = async (id: string, updates: Partial<PremiumSection>) => {
    const { error } = await supabase.from("menu_sections_premium").update(updates).eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return; }
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast.success("Salvo!");
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Excluir esta seção?")) return;
    await supabase.from("menu_sections_premium").delete().eq("id", id);
    toast.success("Seção excluída");
    fetchData();
  };

  const toggleProduct = async (sectionId: string, productId: string) => {
    const existing = sectionProducts.find((sp) => sp.section_id === sectionId && sp.product_id === productId);
    if (existing) {
      await supabase.from("menu_section_products").delete().eq("id", existing.id);
    } else {
      const maxPos = sectionProducts.filter((sp) => sp.section_id === sectionId).reduce((m, sp) => Math.max(m, sp.position), -1);
      await supabase.from("menu_section_products").insert({ section_id: sectionId, product_id: productId, position: maxPos + 1 });
    }
    fetchData();
  };

  const moveProduct = async (sectionId: string, productId: string, direction: "up" | "down") => {
    const items = sectionProducts.filter((sp) => sp.section_id === sectionId).sort((a, b) => a.position - b.position);
    const idx = items.findIndex((i) => i.product_id === productId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    await Promise.all([
      supabase.from("menu_section_products").update({ position: items[swapIdx].position }).eq("id", items[idx].id),
      supabase.from("menu_section_products").update({ position: items[idx].position }).eq("id", items[swapIdx].id),
    ]);
    fetchData();
  };

  const toggleProductDisponivel = async (product: any) => {
    const { error } = await supabase.from("menu_items").update({ disponivel: !product.disponivel }).eq("id", product.id);
    if (error) { toast.error("Erro ao alterar disponibilidade"); return; }
    toast.success(product.disponivel ? "Produto indisponível" : "Produto disponível");
  };

  const toggleProductVisivel = async (product: any) => {
    const { error } = await supabase.from("menu_items").update({ visivel: !product.visivel }).eq("id", product.id);
    if (error) { toast.error("Erro ao alterar visibilidade"); return; }
    toast.success(product.visivel ? "Produto oculto" : "Produto visível");
  };

  const handleProductDragEnd = (sectionId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = sectionProducts.filter((sp) => sp.section_id === sectionId).sort((a, b) => a.position - b.position);
    const oldIndex = items.findIndex((sp) => sp.id === active.id);
    const newIndex = items.findIndex((sp) => sp.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(items, oldIndex, newIndex);
    // Optimistic update
    setSectionProducts((prev) => {
      const others = prev.filter((sp) => sp.section_id !== sectionId);
      return [...others, ...newOrder.map((sp, i) => ({ ...sp, position: i }))];
    });
    // Persist
    Promise.all(newOrder.map((sp, i) =>
      supabase.from("menu_section_products").update({ position: i }).eq("id", sp.id)
    )).then(() => toast.success("Ordem dos produtos atualizada!"));
  };

  const removeProduct = async (sectionId: string, productId: string) => {
    await supabase.from("menu_section_products").delete().match({ section_id: sectionId, product_id: productId });
    fetchData();
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    const { error } = await supabase.from("menu_items").update({
      name: editingProduct.name,
      description: editingProduct.description,
      price: parseFloat(editingProduct.price) || 0,
      original_price: editingProduct.original_price ? parseFloat(editingProduct.original_price) : null,
      image_url: editingProduct.image_url,
      category_id: editingProduct.category_id,
      badges: editingProduct.badges || [],
      tempo_preparo: editingProduct.tempo_preparo || 10,
      estacao_preparo: editingProduct.estacao_preparo || "Cozinha",
    }).eq("id", editingProduct.id);
    if (error) { toast.error("Erro ao salvar produto"); return; }
    setEditingProduct(null);
    toast.success("Produto atualizado!");
    fetchData();
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
      toast.error("Erro ao enviar imagem");
    }
  };

  const handleCreateProduct = async () => {
    if (!showCreateProduct || !newProduct.name || !newProduct.price || !newProduct.category_id) {
      toast.error("Preencha nome, preço e categoria");
      return;
    }
    const { data, error } = await supabase.from("menu_items").insert({
      name: newProduct.name,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      original_price: newProduct.original_price ? parseFloat(newProduct.original_price) : null,
      image_url: newProduct.image_url,
      category_id: newProduct.category_id,
      badges: newProduct.badges || [],
      tempo_preparo: newProduct.tempo_preparo || 10,
      estacao_preparo: newProduct.estacao_preparo || "Cozinha",
      is_active: true,
      disponivel: true,
      visivel: true,
    }).select("id").single();
    if (error || !data) { toast.error("Erro ao criar produto"); return; }

    const maxPos = sectionProducts.filter((sp) => sp.section_id === showCreateProduct).reduce((m, sp) => Math.max(m, sp.position), -1);
    await supabase.from("menu_section_products").insert({ section_id: showCreateProduct, product_id: data.id, position: maxPos + 1 });

    setNewProduct({ name: "", description: "", price: "", original_price: "", image_url: "", category_id: "", badges: [], tempo_preparo: 10, estacao_preparo: "Cozinha" });
    setShowCreateProduct(null);
    toast.success("Produto criado e vinculado!");
    fetchData();
  };

  const filteredProducts = allProducts.filter((p) =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const getSectionProducts = (sectionId: string) => {
    const linked = sectionProducts.filter((sp) => sp.section_id === sectionId).sort((a, b) => a.position - b.position);
    return linked.map((sp) => ({ ...sp, product: allProducts.find((p) => p.id === sp.product_id) })).filter((x) => x.product);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(sections, oldIndex, newIndex);
    setSections(newOrder);
    // Persist new order
    const updates = newOrder.map((s, i) =>
      supabase.from("menu_sections_premium").update({ sort_order: i }).eq("id", s.id)
    );
    Promise.all(updates).then(() => toast.success("Ordem atualizada!"));
  };

  const toggleActive = async (section: PremiumSection) => {
    await updateSection(section.id, { active: !section.active });
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Seções Premium ({sections.length})</h3>
        <Button onClick={createSection} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Seção</Button>
      </div>

      {sections.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma seção premium criada. Crie uma para destacar produtos no topo do cardápio.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <SortableItem key={section.id} id={section.id} className={`rounded-xl border border-border bg-card ${!section.active ? "opacity-50" : ""}`}>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <Badge variant={section.active ? "default" : "secondary"}>
                      {section.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline">
                      {section.type === "carousel" ? <><Columns3 className="h-3 w-3 mr-1" />Carrossel</> : <><LayoutGrid className="h-3 w-3 mr-1" />Grid</>}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingSection(section)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowProductPicker(section.id)}><Package className="h-4 w-4 mr-1" />Produtos</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateProduct(section.id)}><Plus className="h-4 w-4 mr-1" />Criar Produto</Button>
                    <button
                      onClick={() => toggleActive(section)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                        section.active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                      }`}
                      title={section.active ? "Desativar seção" : "Ativar seção"}
                    >
                      {section.active ? "Disponível" : "Indisponível"}
                    </button>
                    <button
                      onClick={() => toggleActive(section)}
                      className="text-muted-foreground hover:text-foreground transition"
                      title={section.active ? "Ocultar seção" : "Mostrar seção"}
                    >
                      {section.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteSection(section.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {getSectionProducts(section.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum produto vinculado. Clique em "Produtos" para adicionar.</p>
                  )}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd(section.id)} modifiers={[restrictToVerticalAxis]}>
                    <SortableContext items={getSectionProducts(section.id).map((sp) => sp.id)} strategy={verticalListSortingStrategy}>
                      {getSectionProducts(section.id).map((sp) => (
                        <SortableItem key={sp.id} id={sp.id} className={`rounded-md border p-2 ${sp.product?.visivel === false ? "opacity-50" : ""}`}>
                          <div className="flex items-center gap-2 text-sm">
                            {sp.product?.image_url && <img src={sp.product.image_url} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" decoding="async" width={32} height={32} />}
                            <span className="flex-1 truncate font-medium">{sp.product?.name}</span>
                            <span className="text-muted-foreground">R$ {sp.product?.price.toFixed(2)}</span>
                            <button
                              onClick={() => sp.product && toggleProductDisponivel(sp.product)}
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                                sp.product?.disponivel !== false
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                              }`}
                              title={sp.product?.disponivel !== false ? "Marcar indisponível" : "Marcar disponível"}
                            >
                              {sp.product?.disponivel !== false ? "Disponível" : "Indisponível"}
                            </button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sp.product && setEditingProduct({ ...sp.product, price: String(sp.product.price), original_price: sp.product.original_price ? String(sp.product.original_price) : "" })} title="Editar produto">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <button
                              onClick={() => sp.product && toggleProductVisivel(sp.product)}
                              className="text-muted-foreground hover:text-foreground transition"
                              title={sp.product?.visivel !== false ? "Ocultar produto" : "Mostrar produto"}
                            >
                              {sp.product?.visivel !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduct(section.id, sp.product_id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Seção</DialogTitle></DialogHeader>
          {editingSection && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={editingSection.name} onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={editingSection.type} onValueChange={(v) => setEditingSection({ ...editingSection, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carousel">Carrossel</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tamanho da Imagem</label>
                <Select value={editingSection.product_image_size} onValueChange={(v) => setEditingSection({ ...editingSection, product_image_size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeno</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Ativa</label>
                <Switch checked={editingSection.active} onCheckedChange={(v) => setEditingSection({ ...editingSection, active: v })} />
              </div>
              {editingSection.type === "carousel" && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto-scroll</label>
                    <Switch checked={editingSection.auto_scroll} onCheckedChange={(v) => setEditingSection({ ...editingSection, auto_scroll: v })} />
                  </div>
                  {editingSection.auto_scroll && (
                    <div>
                      <label className="text-sm font-medium">Velocidade (ms)</label>
                      <Input type="number" value={editingSection.speed} onChange={(e) => setEditingSection({ ...editingSection, speed: parseInt(e.target.value) || 3000 })} />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="text-sm font-medium">Ordem</label>
                <Input type="number" value={editingSection.sort_order} onChange={(e) => setEditingSection({ ...editingSection, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <Button className="w-full" onClick={() => {
                updateSection(editingSection.id, {
                  name: editingSection.name,
                  type: editingSection.type,
                  active: editingSection.active,
                  sort_order: editingSection.sort_order,
                  auto_scroll: editingSection.auto_scroll,
                  speed: editingSection.speed,
                  product_image_size: editingSection.product_image_size,
                });
                setEditingSection(null);
              }}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Picker Dialog */}
      <Dialog open={!!showProductPicker} onOpenChange={() => { setShowProductPicker(null); setProductSearch(""); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Selecionar Produtos</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredProducts.map((product) => {
              const isLinked = sectionProducts.some((sp) => sp.section_id === showProductPicker && sp.product_id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => showProductPicker && toggleProduct(showProductPicker, product.id)}
                  className={`flex w-full items-center gap-3 rounded-md border p-2 text-sm transition hover:bg-accent/50 ${isLinked ? "border-primary bg-primary/10" : ""}`}
                >
                  {product.image_url && <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" decoding="async" width={40} height={40} />}
                  <div className="flex-1 text-left">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">R$ {product.price.toFixed(2)}</p>
                  </div>
                  {isLinked ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={!!showCreateProduct} onOpenChange={() => setShowCreateProduct(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Criar Produto Rápido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nome *</label><Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Descrição</label><Textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Preço (R$) *</label><Input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Preço Original (R$)</label><Input type="number" step="0.01" value={newProduct.original_price || ""} onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value })} placeholder="Opcional" /></div>
            </div>
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <Input value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} placeholder="https://..." />
              <label className="mt-1 flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                <Upload className="h-3 w-3" /> Ou enviar arquivo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (url) => setNewProduct((p: any) => ({ ...p, image_url: url })))} />
              </label>
            </div>
            {newProduct.image_url && <img src={newProduct.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />}
            <div>
              <label className="text-sm font-medium">Categoria *</label>
              <Select value={newProduct.category_id} onValueChange={(v) => setNewProduct({ ...newProduct, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tempo Preparo (min)</label>
                <Input type="number" value={newProduct.tempo_preparo || 10} onChange={(e) => setNewProduct({ ...newProduct, tempo_preparo: parseInt(e.target.value) || 10 })} />
              </div>
              <div>
                <label className="text-sm font-medium">Estação de Preparo</label>
                <Select value={newProduct.estacao_preparo || "Cozinha"} onValueChange={(v) => setNewProduct({ ...newProduct, estacao_preparo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estacoes.map((e: string) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Badges</label>
              <div className="flex gap-2 mt-1">
                {badgeOptions.map((b) => (
                  <label key={b.value} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={(newProduct.badges || []).includes(b.value)}
                      onChange={(e) => {
                        const badges = newProduct.badges || [];
                        setNewProduct({ ...newProduct, badges: e.target.checked ? [...badges, b.value] : badges.filter((x: string) => x !== b.value) });
                      }}
                    />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateProduct}>Criar e Vincular</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Produto</DialogTitle></DialogHeader>
          {editingProduct && (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Nome</label><Input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Descrição</label><Textarea value={editingProduct.description || ""} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Preço (R$)</label><Input type="number" step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Preço Original (R$)</label><Input type="number" step="0.01" value={editingProduct.original_price || ""} onChange={(e) => setEditingProduct({ ...editingProduct, original_price: e.target.value })} placeholder="Opcional" /></div>
              </div>
              <div>
                <label className="text-sm font-medium">URL da Imagem</label>
                <Input value={editingProduct.image_url || ""} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} />
                <label className="mt-1 flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <Upload className="h-3 w-3" /> Ou enviar arquivo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (url) => setEditingProduct((p: any) => ({ ...p, image_url: url })))} />
                </label>
              </div>
              {editingProduct.image_url && <img src={editingProduct.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />}
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Select value={editingProduct.category_id} onValueChange={(v) => setEditingProduct({ ...editingProduct, category_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Tempo Preparo (min)</label>
                  <Input type="number" value={editingProduct.tempo_preparo || 10} onChange={(e) => setEditingProduct({ ...editingProduct, tempo_preparo: parseInt(e.target.value) || 10 })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Estação de Preparo</label>
                  <Select value={editingProduct.estacao_preparo || "Cozinha"} onValueChange={(v) => setEditingProduct({ ...editingProduct, estacao_preparo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {estacoes.map((e: string) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Badges</label>
                <div className="flex gap-2 mt-1">
                  {badgeOptions.map((b) => (
                    <label key={b.value} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={(editingProduct.badges || []).includes(b.value)}
                        onChange={(e) => {
                          const badges = editingProduct.badges || [];
                          setEditingProduct({ ...editingProduct, badges: e.target.checked ? [...badges, b.value] : badges.filter((x: string) => x !== b.value) });
                        }}
                      />
                      {b.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleSaveProduct}>Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
