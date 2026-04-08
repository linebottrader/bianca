import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreConfig } from "@/hooks/useStoreData";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_DESIGN,
  DESIGN_KEYS,
  THEME_PRESETS,
  type DesignTokens,
} from "@/hooks/useDesignTokens";
import { Save, RotateCcw, Palette, Upload, Plus, Minus, Image } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { withTimeout, logAndToast } from "@/utils/adminUtils";

type FieldDef = {
  key: keyof DesignTokens;
  label: string;
  type: "color" | "text" | "image" | "font" | "size";
};

const FONT_OPTIONS = [
  "Open Sans", "Roboto", "Lato", "Poppins", "Montserrat", "Inter",
  "Nunito", "Raleway", "Oswald", "Playfair Display", "Merriweather",
  "Ubuntu", "Source Sans Pro", "PT Sans", "Noto Sans", "Arial", "Verdana",
];

const TABS: { value: string; label: string; fields: FieldDef[] }[] = [
  {
    value: "general",
    label: "Cores Gerais",
    fields: [
      { key: "design_bg_body", label: "Fundo da Página", type: "color" },
      { key: "design_bg_container", label: "Fundo dos Containers", type: "color" },
      { key: "design_color_primary", label: "Cor Primária", type: "color" },
      { key: "design_color_secondary", label: "Cor Secundária", type: "color" },
      { key: "design_color_text_main", label: "Texto Principal", type: "color" },
      { key: "design_color_text_light", label: "Texto Secundário", type: "color" },
    ],
  },
  {
    value: "header",
    label: "Header",
    fields: [
      { key: "design_header_bg", label: "Fundo do Header", type: "color" },
      { key: "design_header_text", label: "Texto do Header", type: "color" },
      { key: "design_header_badge_bg", label: "Fundo do Badge", type: "color" },
      { key: "design_header_badge_text", label: "Texto do Badge", type: "color" },
    ],
  },
  {
    value: "banner",
    label: "Banner",
    fields: [
      { key: "design_banner_overlay", label: "Overlay do Banner", type: "text" },
      { key: "design_banner_button_bg", label: "Fundo Botão Banner", type: "color" },
      { key: "design_banner_button_text", label: "Texto Botão Banner", type: "color" },
      { key: "design_banner_title_color", label: "Cor Título Banner", type: "color" },
    ],
  },
  {
    value: "categories",
    label: "Categorias",
    fields: [
      { key: "design_category_bg", label: "Fundo Categoria", type: "color" },
      { key: "design_category_text", label: "Texto Categoria", type: "color" },
      { key: "design_category_active_bg", label: "Fundo Ativa", type: "color" },
      { key: "design_category_active_text", label: "Texto Ativa", type: "color" },
      { key: "design_category_border_radius", label: "Borda Arredondada", type: "size" },
      { key: "design_category_text_size", label: "Tamanho Texto Categoria", type: "size" },
    ],
  },
  {
    value: "products",
    label: "Produtos",
    fields: [
      { key: "design_card_bg", label: "Fundo do Card", type: "color" },
      { key: "design_card_title_color", label: "Título do Card", type: "color" },
      { key: "design_card_title_size", label: "Tamanho Título", type: "size" },
      { key: "design_card_description_color", label: "Descrição do Card", type: "color" },
      { key: "design_card_description_size", label: "Tamanho Descrição", type: "size" },
      { key: "design_price_color", label: "Cor do Preço", type: "color" },
      { key: "design_price_size", label: "Tamanho Preço", type: "size" },
      { key: "design_badge_bg", label: "Fundo Badge", type: "color" },
      { key: "design_badge_text", label: "Texto Badge", type: "color" },
    ],
  },
  {
    value: "buttons",
    label: "Botões",
    fields: [
      { key: "design_button_primary_bg", label: "Fundo Primário", type: "color" },
      { key: "design_button_primary_text", label: "Texto Primário", type: "color" },
      { key: "design_button_secondary_bg", label: "Fundo Secundário", type: "color" },
      { key: "design_button_secondary_text", label: "Texto Secundário", type: "color" },
      { key: "design_button_radius", label: "Borda Arredondada", type: "size" },
    ],
  },
  {
    value: "cart",
    label: "Carrinho",
    fields: [
      { key: "design_cart_bg", label: "Fundo Carrinho", type: "color" },
      { key: "design_cart_title_color", label: "Título Carrinho", type: "color" },
      { key: "design_cart_border_color", label: "Borda Carrinho", type: "color" },
    ],
  },
  {
    value: "typography",
    label: "Tipografia",
    fields: [
      { key: "design_font_family", label: "Fonte Global", type: "font" },
      { key: "design_title_size", label: "Tamanho Título", type: "size" },
      { key: "design_text_size", label: "Tamanho Texto", type: "size" },
    ],
  },
  {
    value: "borders",
    label: "Bordas",
    fields: [
      { key: "design_card_radius", label: "Borda Card", type: "size" },
      { key: "design_card_shadow", label: "Sombra Card", type: "text" },
      { key: "design_container_width", label: "Largura Container", type: "size" },
    ],
  },
  {
    value: "images",
    label: "Imagens",
    fields: [
      { key: "design_bg_image_url", label: "Imagem de Fundo", type: "image" },
      { key: "design_alt_logo_url", label: "Logo Alternativa", type: "image" },
    ],
  },
];

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center gap-3">
    <input
      type="color"
      value={value.startsWith("#") ? value : "#000000"}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-10 cursor-pointer rounded border border-border p-0.5"
    />
    <div className="flex-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 h-8 text-xs"
      />
    </div>
  </div>
);

const FontField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Selecione uma fonte" />
      </SelectTrigger>
      <SelectContent>
        {FONT_OPTIONS.map((font) => (
          <SelectItem key={font} value={font}>
            <span style={{ fontFamily: font }}>{font}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const SizeField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const parseValue = (v: string) => {
    const match = v.match(/^([\d.]+)\s*(rem|px|em|%|vw|vh)?$/);
    if (!match) return { num: 0, unit: "rem" };
    return { num: parseFloat(match[1]), unit: match[2] || "rem" };
  };

  const { num, unit } = parseValue(value);

  const step = unit === "px" ? 1 : unit === "%" || unit === "vw" || unit === "vh" ? 5 : 0.125;

  const decrease = () => {
    const newVal = Math.max(0, Math.round((num - step) * 1000) / 1000);
    onChange(`${newVal}${unit}`);
  };
  const increase = () => {
    const newVal = Math.round((num + step) * 1000) / 1000;
    onChange(`${newVal}${unit}`);
  };

  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={decrease} disabled={num <= 0}>
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-center text-sm"
        />
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={increase}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const ImageField = ({
  label,
  value,
  onChange,
  onUpload,
  uploading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    {value && (
      <img src={value} alt={label} className="mt-1 h-16 w-auto rounded border border-border object-contain" />
    )}
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" placeholder="URL da imagem" />
    <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary">
      <Upload className="h-3 w-3" />
      {uploading ? "Enviando..." : "Upload"}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
    </label>
  </div>
);

const AdminDesignEditor = () => {
  const { data: config, isLoading } = useStoreConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<DesignTokens>({ ...DEFAULT_DESIGN });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (config) {
      const merged = { ...DEFAULT_DESIGN };
      for (const key of DESIGN_KEYS) {
        const val = (config as any)[key];
        if (val) (merged as any)[key] = val;
      }
      setForm(merged);
    }
  }, [config]);

  const updateField = (key: keyof DesignTokens, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (file: File, key: keyof DesignTokens) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `design-${key}-${Date.now()}.${ext}`;
      const { error } = await withTimeout(
        supabase.storage.from("store-images").upload(path, file, { upsert: true })
      );
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(path);
      updateField(key, urlData.publicUrl);
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      logAndToast(err, "Enviar imagem de design", toast);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      for (const key of DESIGN_KEYS) {
        updates[key] = form[key];
      }
      const { error } = await withTimeout(
        supabase.from("store_config").update(updates).eq("id", config!.id)
      );
      if (error) throw error;
      queryClient.setQueryData(["store-config"], (old: any) => old ? { ...old, ...updates } : old);
      toast({ title: "Design salvo com sucesso!" });
    } catch (err: any) {
      logAndToast(err, "Salvar design", toast);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (tokens: Partial<DesignTokens>) => {
    setForm((prev) => ({ ...prev, ...tokens }));
  };

  const handleRestore = () => {
    setForm({ ...DEFAULT_DESIGN });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Temas Prontos</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.tokens)}
            >
              {preset.emoji} {preset.name}
            </Button>
          ))}
          <Button variant="destructive" size="sm" onClick={handleRestore}>
            <RotateCcw className="mr-1 h-3 w-3" /> Restaurar Padrão
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Tabs defaultValue="general">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Product Image Config - special tab content */}
          <TabsContent value="products" className="mt-4">
            {/* Image configuration section */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Image className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Configurações das Imagens dos Produtos</h4>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Width */}
                <div>
                  <label className="text-sm font-medium">Largura da imagem (px)</label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      min={60} max={300} step={1}
                      value={[parseInt(form.design_product_img_width) || 90]}
                      onValueChange={([v]) => {
                        updateField("design_product_img_width", `${v}px`);
                        if (form.design_product_img_ratio_lock === "true") {
                          updateField("design_product_img_height", `${v}px`);
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-12 text-right">{parseInt(form.design_product_img_width) || 90}px</span>
                  </div>
                </div>
                {/* Height */}
                <div>
                  <label className="text-sm font-medium">Altura da imagem (px)</label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      min={60} max={300} step={1}
                      value={[parseInt(form.design_product_img_height) || 90]}
                      onValueChange={([v]) => {
                        updateField("design_product_img_height", `${v}px`);
                        if (form.design_product_img_ratio_lock === "true") {
                          updateField("design_product_img_width", `${v}px`);
                        }
                      }}
                      className="flex-1"
                      disabled={form.design_product_img_ratio_lock === "true"}
                    />
                    <span className="text-sm font-mono w-12 text-right">{parseInt(form.design_product_img_height) || 90}px</span>
                  </div>
                </div>
                {/* Ratio lock */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Manter proporção automática</label>
                  <Switch
                    checked={form.design_product_img_ratio_lock === "true"}
                    onCheckedChange={(c) => {
                      updateField("design_product_img_ratio_lock", c ? "true" : "false");
                      if (c) updateField("design_product_img_height", form.design_product_img_width);
                    }}
                  />
                </div>
                {/* Shape */}
                <div>
                  <label className="text-sm font-medium">Formato da imagem</label>
                  <Select value={form.design_product_img_shape} onValueChange={(v) => updateField("design_product_img_shape", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quadrado">Quadrado</SelectItem>
                      <SelectItem value="retangular">Retangular</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Hover zoom */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Zoom ao passar o mouse (desktop)</label>
                    <p className="text-xs text-muted-foreground">Efeito de zoom ao hover</p>
                  </div>
                  <Switch
                    checked={form.design_product_img_hover_zoom === "true"}
                    onCheckedChange={(c) => updateField("design_product_img_hover_zoom", c ? "true" : "false")}
                  />
                </div>
              </div>
              {/* Preview */}
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-dashed border-border">
                <div
                  className="bg-muted shrink-0 overflow-hidden flex items-center justify-center text-xs text-muted-foreground"
                  style={{
                    width: `${Math.min(parseInt(form.design_product_img_width) || 90, 150)}px`,
                    height: `${Math.min(parseInt(form.design_product_img_height) || 90, 150)}px`,
                    borderRadius: form.design_product_img_shape === "circular" ? "50%" : form.design_product_img_shape === "retangular" ? "6px" : "8px",
                  }}
                >
                  Preview
                </div>
                <span className="text-xs text-muted-foreground">Pré-visualização do formato</span>
              </div>
            </div>
            {/* Original product fields */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TABS.find(t => t.value === "products")!.fields.map((field) => {
                if (field.type === "color") return <ColorField key={field.key} label={field.label} value={form[field.key]} onChange={(v) => updateField(field.key, v)} />;
                if (field.type === "size") return <SizeField key={field.key} label={field.label} value={form[field.key]} onChange={(v) => updateField(field.key, v)} />;
                return null;
              })}
            </div>
          </TabsContent>

          {TABS.filter(t => t.value !== "products").map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tab.fields.map((field) => {
                  if (field.type === "color") {
                    return (
                      <ColorField
                        key={field.key}
                        label={field.label}
                        value={form[field.key]}
                        onChange={(v) => updateField(field.key, v)}
                      />
                    );
                  }
                  if (field.type === "image") {
                    return (
                      <ImageField
                        key={field.key}
                        label={field.label}
                        value={form[field.key]}
                        onChange={(v) => updateField(field.key, v)}
                        onUpload={(file) => handleImageUpload(file, field.key)}
                        uploading={uploading}
                      />
                    );
                  }
                  if (field.type === "font") {
                    return (
                      <FontField
                        key={field.key}
                        label={field.label}
                        value={form[field.key]}
                        onChange={(v) => updateField(field.key, v)}
                      />
                    );
                  }
                  if (field.type === "size") {
                    return (
                      <SizeField
                        key={field.key}
                        label={field.label}
                        value={form[field.key]}
                        onChange={(v) => updateField(field.key, v)}
                      />
                    );
                  }
                  return (
                    <div key={field.key}>
                      <label className="text-sm font-medium">{field.label}</label>
                      <Input
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Design"}
      </Button>
    </div>
  );
};

export default AdminDesignEditor;
