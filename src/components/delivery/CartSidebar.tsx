import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useCustomer } from "@/contexts/CustomerAuthContext";
import { useStoreConfig } from "@/hooks/useStoreData";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Trash2, Plus, Minus, ShoppingCart, User, AlertTriangle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import CheckoutModal from "./CheckoutModal";
import CustomerAuthModal from "./CustomerAuthModal";

const CartSidebar = () => {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const { cliente, user, logout } = useCustomer();
  const { data: config } = useStoreConfig();
  const { isOpen: storeIsOpen, countdownText, statusMessage } = useStoreStatus();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const { trackEvent } = useAnalytics();

  const deliveryFee =
    totalPrice >= (config?.delivery_free_above ?? 50) ? 0 : (config?.delivery_fee ?? 5);
  const grandTotal = totalPrice + deliveryFee;

  const minimumOrder = config?.minimum_order ?? 0;
  const missingValue = Math.max(minimumOrder - totalPrice, 0);
  const progress = minimumOrder > 0 ? Math.min((totalPrice / minimumOrder) * 100, 100) : 100;
  const meetsMinimum = totalPrice >= minimumOrder || minimumOrder <= 0;
  const canCheckout = storeIsOpen && meetsMinimum;

  return (
    <>
      <div
        className="rounded-xl"
        style={{
          background: "var(--d-cart-bg)",
          border: "1px solid var(--d-cart-border-color)",
          borderRadius: "var(--d-card-radius)",
        }}
      >
        {/* User status */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid var(--d-cart-border-color)" }}>
          {user && cliente ? (
            <div className="flex items-center gap-2 text-xs">
              <User className="h-3 w-3" style={{ color: "var(--d-color-primary)" }} />
              <span style={{ color: "var(--d-color-text-light)" }} className="truncate max-w-[140px]">{cliente.nome_completo}</span>
              <button onClick={logout} className="text-destructive hover:underline text-xs">Sair</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--d-color-primary)" }}>
              <User className="h-3 w-3" /> Entrar / Cadastrar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--d-cart-border-color)" }}>
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--d-color-primary)" }} />
          <h2 className="font-display text-xl tracking-wider" style={{ color: "var(--d-cart-title-color)" }}>Carrinho</h2>
        </div>

        {items.length === 0 ? (
          <p className="p-6 text-center text-sm" style={{ color: "var(--d-color-text-light)" }}>
            Sem itens no carrinho!
          </p>
        ) : (
          <div>
            <div className="max-h-80 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "var(--d-category-bg)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--d-card-title-color)" }}>{item.menuItem.name}</p>
                    {item.selectedOptions.length > 0 && (
                      <p className="mt-0.5 text-xs" style={{ color: "var(--d-color-text-light)" }}>
                        {(() => {
                          // Group options by id and show quantities
                          const grouped = new Map<string, { name: string; qty: number }>();
                          for (const o of item.selectedOptions) {
                            const qty = (o as any).quantity ?? 1;
                            const existing = grouped.get(o.id);
                            if (existing) {
                              existing.qty += qty;
                            } else {
                              grouped.set(o.id, { name: o.name, qty });
                            }
                          }
                          return Array.from(grouped.values())
                            .map((g) => (g.qty > 1 ? `${g.qty}x ${g.name}` : g.name))
                            .join(", ");
                        })()}
                      </p>
                    )}
                    {item.notes && (
                      <p className="mt-0.5 text-xs italic" style={{ color: "var(--d-color-text-light)" }}>Obs: {item.notes}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded p-1" style={{ background: "var(--d-cart-border-color)", color: "var(--d-color-text-light)" }}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold" style={{ color: "var(--d-color-text-main)" }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded p-1" style={{ background: "var(--d-cart-border-color)", color: "var(--d-color-text-light)" }}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-bold" style={{ color: "var(--d-price-color)" }}>R$ {item.totalPrice.toFixed(2)}</span>
                    <button onClick={() => removeItem(item.id)} className="hover:text-destructive" style={{ color: "var(--d-color-text-light)" }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Minimum order indicator */}
            {minimumOrder > 0 && (
              <div className="px-4 pt-3">
                <div
                  className="rounded-lg p-3 space-y-2"
                  style={{
                    background: meetsMinimum ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)",
                    border: `1px solid ${meetsMinimum ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {meetsMinimum ? (
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#16a34a" }} />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#ca8a04" }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: meetsMinimum ? "#16a34a" : "#ca8a04" }}>
                      {meetsMinimum ? "Pedido mínimo atingido!" : `Pedido mínimo: R$ ${minimumOrder.toFixed(2)}`}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs" style={{ color: meetsMinimum ? "#16a34a" : "#ca8a04" }}>
                    {meetsMinimum
                      ? "Você já pode finalizar seu pedido."
                      : `Faltam R$ ${missingValue.toFixed(2)} para finalizar.`}
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 space-y-2" style={{ borderTop: "1px solid var(--d-cart-border-color)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--d-color-text-light)" }}>Subtotal</span>
                <span className="font-semibold" style={{ color: "var(--d-color-text-main)" }}>R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--d-color-text-light)" }}>Entrega</span>
                <span className="font-semibold">
                  {deliveryFee === 0 ? <span className="text-success">Grátis</span> : <span style={{ color: "var(--d-color-text-main)" }}>R$ {deliveryFee.toFixed(2)}</span>}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: "1px solid var(--d-cart-border-color)" }}>
                <span style={{ color: "var(--d-color-text-main)" }}>Total</span>
                <span style={{ color: "var(--d-price-color)" }}>R$ {grandTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => { trackEvent("click_order", { cart_total: totalPrice, item_count: items.length }); setShowCheckout(true); }}
                disabled={!canCheckout}
                className="w-full py-3 text-center font-bold transition"
                style={{
                  borderRadius: "var(--d-btn-radius)",
                  background: canCheckout ? "#25d366" : "var(--d-category-bg)",
                  color: canCheckout ? "#fff" : "var(--d-color-text-light)",
                  cursor: canCheckout ? "pointer" : "not-allowed",
                }}
              >
                {!storeIsOpen ? "Loja Fechada" : !meetsMinimum ? `Mínimo R$ ${minimumOrder.toFixed(2)}` : "Finalizar Pedido"}
              </button>
              {!storeIsOpen && (
                <p className="text-xs text-center text-destructive">
                  {countdownText || statusMessage}
                </p>
              )}
              <button onClick={clearCart} className="w-full text-center text-xs hover:text-destructive" style={{ color: "var(--d-color-text-light)" }}>
                Limpar carrinho
              </button>
            </div>
          </div>
        )}
      </div>

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
      {showAuth && <CustomerAuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
};

export default CartSidebar;
