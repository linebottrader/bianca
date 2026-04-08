import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionGroups, useProductOptionGroups } from "@/hooks/useStoreData";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Link2 } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";

type Props = {
  productId: string;
};

const AdminMenuItemOptionGroups = ({ productId }: Props) => {
  const { data: groups } = useOptionGroups();
  const { data: links } = useProductOptionGroups();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const linkedGroupIds = (links || [])
    .filter((l) => l.product_id === productId)
    .map((l) => l.group_id);

  const handleToggle = async (groupId: string, linked: boolean) => {
    setSaving(true);
    const maxOrdem = Math.max(0, ...(links || []).filter((l) => l.product_id === productId).map((l) => l.ordem));
    try {
      if (linked) {
        const { error } = await withTimeout(
          supabase.from("product_option_groups").delete().eq("product_id", productId).eq("group_id", groupId)
        );
        if (error) throw error;
      } else {
        const { error } = await withTimeout(
          supabase.from("product_option_groups").insert({ product_id: productId, group_id: groupId, ordem: maxOrdem + 1 } as any)
        );
        if (error) throw error;
      }
      // Optimistic cache update
      queryClient.setQueryData(["product-option-groups"], (old: any[] | undefined) => {
        if (!old) return old;
        if (linked) {
          return old.filter((l) => !(l.product_id === productId && l.group_id === groupId));
        }
        return [...old, { id: crypto.randomUUID(), product_id: productId, group_id: groupId, ordem: maxOrdem + 1 }];
      });
      queryClient.invalidateQueries({ queryKey: ["product-option-groups"] });
    } catch (err: any) {
      logAndToast(err, "Vincular grupo", toast);
      queryClient.invalidateQueries({ queryKey: ["product-option-groups"] });
    } finally {
      setSaving(false);
    }
  };

  if (!groups || groups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground mt-2">
        Nenhum grupo de opções disponível. Crie na aba Opções.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Link2 className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">Grupos de Opções</span>
      </div>
      <div className="space-y-1">
        {groups.filter((g) => g.ativo).map((group) => {
          const isLinked = linkedGroupIds.includes(group.id);
          return (
            <div key={group.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Switch
                checked={isLinked}
                onCheckedChange={() => handleToggle(group.id, isLinked)}
                disabled={saving}
              />
              <span className="text-sm flex-1">{group.nome}</span>
              <span className="text-xs text-muted-foreground">{group.items.length} itens</span>
              {group.obrigatorio && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Obrigatório</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminMenuItemOptionGroups;
