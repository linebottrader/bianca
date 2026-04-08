import { useState, useMemo, useCallback, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";
import type { DBMenuItem, DBOptionItem, DBOptionGroup } from "@/hooks/useStoreData";
import { useCart } from "@/contexts/CartContext";
import { useAnalytics } from "@/hooks/useAnalytics";

type Props = {
  item: DBMenuItem;
  onClose: () => void;
};

/** groupId → itemId → quantity */
type OptionQuantities = Record<string, Record<string, number>>;

const ProductModal = ({ item, onClose }: Props) => {
  const { addItem } = useCart();
  const { trackEvent } = useAnalytics();
  const [quantity, setQuantity] = useState(1);
  const [optionQtys, setOptionQtys] = useState<OptionQuantities>({});
  const [notes, setNotes] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Track product view
  useEffect(() => {
    trackEvent("product_view", { product_id: item.id, product_name: item.name }, 500);
  }, [item.id, item.name, trackEvent]);

  const validGroups = item.options?.filter((g) => g.items.length > 0) || [];

  const getGroupTotal = useCallback(
    (groupId: string) => {
      const items = optionQtys[groupId];
      if (!items) return 0;
      return Object.values(items).reduce((s, q) => s + q, 0);
    },
    [optionQtys]
  );

  const handleQtyChange = useCallback(
    (group: DBOptionGroup, optItem: DBOptionItem, delta: number) => {
      setOptionQtys((prev) => {
        const groupMap = { ...(prev[group.id] || {}) };
        const current = groupMap[optItem.id] || 0;
        const newQty = current + delta;

        if (newQty < 0) return prev;

        if (group.max_selecao === 1) {
          // Radio-like: selecting sets this to 1, clears others
          if (delta > 0) {
            const cleared: Record<string, number> = {};
            cleared[optItem.id] = 1;
            return { ...prev, [group.id]: cleared };
          }
          // Deselecting
          groupMap[optItem.id] = 0;
          return { ...prev, [group.id]: groupMap };
        }

        // Multi-select: check max
        const groupTotal = getGroupTotal(group.id);
        if (delta > 0 && groupTotal >= group.max_selecao) return prev;

        groupMap[optItem.id] = newQty;
        return { ...prev, [group.id]: groupMap };
      });

      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[group.id];
        return next;
      });
    },
    [getGroupTotal]
  );

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    for (const group of validGroups) {
      const total = getGroupTotal(group.id);
      const minRequired = group.obrigatorio ? Math.max(1, group.min_selecao) : group.min_selecao;
      if (total < minRequired && (group.obrigatorio || group.min_selecao > 0)) {
        errors[group.id] = `Selecione pelo menos ${minRequired} opção(ões)`;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const allRequiredSelected = validGroups
    .filter((g) => g.obrigatorio)
    .every((g) => getGroupTotal(g.id) >= Math.max(1, g.min_selecao));

  // Build flat selected options with quantity for price calculation
  const flatOptions = useMemo(() => {
    const result: { id: string; name: string; price: number; quantity: number }[] = [];
    for (const group of validGroups) {
      const groupMap = optionQtys[group.id] || {};
      for (const optItem of group.items) {
        const qty = groupMap[optItem.id] || 0;
        if (qty > 0) {
          result.push({ id: optItem.id, name: optItem.name, price: optItem.price, quantity: qty });
        }
      }
    }
    return result;
  }, [optionQtys, validGroups]);

  const optionsPrice = flatOptions.reduce((sum, o) => sum + o.price * o.quantity, 0);
  const unitPrice = item.price + optionsPrice;
  const total = unitPrice * quantity;

  const handleAdd = () => {
    if (!validate()) return;
    // Expand options: 2x Coxinha → [{id,name,price,quantity:2}]
    const selectedOptions = flatOptions.map((o) => ({
      id: o.id,
      name: o.name,
      price: o.price,
      quantity: o.quantity,
    }));

    addItem({
      id: `${item.id}-${Date.now()}`,
      menuItem: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image_url,
        category: item.category_id,
      } as any,
      quantity,
      selectedOptions,
      totalPrice: total,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl animate-fade-in"
      >
        <div className="relative overflow-hidden rounded-t-2xl bg-muted flex items-center justify-center" style={{ maxHeight: '50vh' }}>
          <img src={item.image_url} alt={item.name} className="w-full h-auto object-contain" />
          {item.badges && item.badges.length > 0 && (
            <div className="absolute left-0 top-0 flex flex-col gap-0.5 z-10">
              {item.badges.map((badge) => (
                <span
                  key={badge}
                  className="px-5 py-2.5 text-lg font-extrabold shadow-lg"
                  style={{ background: badge === 'promo' ? '#DC2626' : badge === 'new' ? '#16A34A' : badge === 'best' ? '#2563EB' : '#f97316', color: '#fff' }}
                >
                  {badge === 'promo' ? 'Promoção!' : badge === 'new' ? 'Novidade!' : badge === 'best' ? '+ Vendido!' : badge}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-secondary/80 p-1.5 text-secondary-foreground backdrop-blur-sm transition hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <h2 className="font-display text-2xl tracking-wide text-card-foreground">{item.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          <p className="mt-2 text-lg font-bold text-primary">R$ {item.price.toFixed(2)}</p>

          {validGroups.map((group) => {
            const groupTotal = getGroupTotal(group.id);
            const isRadio = group.max_selecao === 1;
            const atMax = groupTotal >= group.max_selecao;

            return (
              <div key={group.id} className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg tracking-wide">{group.nome}</h3>
                    {group.descricao && <p className="text-xs text-muted-foreground">{group.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isRadio && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {groupTotal}/{group.max_selecao}
                      </span>
                    )}
                    {group.obrigatorio && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Obrigatório
                      </span>
                    )}
                  </div>
                </div>
                {validationErrors[group.id] && (
                  <p className="text-xs text-destructive mt-1">{validationErrors[group.id]}</p>
                )}
                <div className="mt-2 space-y-1">
                  {group.items.map((optItem) => {
                    const itemQty = optionQtys[group.id]?.[optItem.id] || 0;
                    const isSelected = itemQty > 0;

                    if (isRadio) {
                      // Radio behavior: tap to select/deselect
                      return (
                        <button
                          key={optItem.id}
                          onClick={() =>
                            handleQtyChange(group, optItem, isSelected ? -1 : 1)
                          }
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                            isSelected
                              ? "border-primary bg-primary/5 text-card-foreground"
                              : "border-border text-card-foreground hover:border-primary/30"
                          }`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          }`}>
                            {isSelected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                          </span>
                          {optItem.imagem_url && (
                            <img src={optItem.imagem_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                          )}
                          <div className="flex-1 text-left">
                            <span>{optItem.name}</span>
                            {optItem.descricao && <p className="text-xs text-muted-foreground">{optItem.descricao}</p>}
                          </div>
                          <span className="font-semibold shrink-0">
                            {optItem.price > 0 ? `+R$ ${optItem.price.toFixed(2)}` : "Grátis"}
                          </span>
                        </button>
                      );
                    }

                    // Multi-select: quantity controls
                    return (
                      <div
                        key={optItem.id}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        {optItem.imagem_url && (
                          <img src={optItem.imagem_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                        )}
                        <div className="flex-1 text-left">
                          <span className="text-card-foreground">{optItem.name}</span>
                          {optItem.descricao && <p className="text-xs text-muted-foreground">{optItem.descricao}</p>}
                        </div>
                        <span className="font-semibold shrink-0 text-card-foreground text-xs">
                          {optItem.price > 0 ? `+R$ ${optItem.price.toFixed(2)}` : "Grátis"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(group, optItem, -1)}
                            disabled={itemQty === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[1.25rem] text-center text-sm font-bold text-card-foreground">
                            {itemQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(group, optItem, 1)}
                            disabled={atMax}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mt-4">
            <h3 className="font-display text-lg tracking-wide">Observações</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sem cebola, molho à parte..."
              className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[1.5rem] text-center font-bold text-foreground">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              disabled={!allRequiredSelected}
              onClick={handleAdd}
              className="flex-1 rounded-lg bg-primary py-3 text-center font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              Adicionar R$ {total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
