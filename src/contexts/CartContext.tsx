import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartOptionItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
};

export type CartItem = {
  id: string;
  menuItem: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
  };
  quantity: number;
  selectedOptions: CartOptionItem[];
  totalPrice: number;
  notes?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY_PREFIX = "cart_";
const GUEST_CART_KEY = "cart_guest";

const getCartKey = (userId: string) => `${CART_KEY_PREFIX}${userId}`;

const loadCart = (key: string): CartItem[] => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveCartToStorage = (key: string, items: CartItem[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
};

const removeCartStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

/** Build a fingerprint for matching "same product config" */
const itemFingerprint = (item: CartItem): string => {
  // Include quantity per option in fingerprint for quantity-based options
  const optSig = item.selectedOptions
    .map(o => `${o.id}:${o.quantity ?? 1}`)
    .sort()
    .join(",");
  return `${item.menuItem.id}|${optSig}|${item.notes ?? ""}`;
};

/** Merge guest cart into user cart, summing quantities for identical items */
const mergeCarts = (guestCart: CartItem[], userCart: CartItem[]): CartItem[] => {
  const merged = userCart.map(item => ({ ...item }));
  const fingerMap = new Map<string, number>();

  merged.forEach((item, idx) => {
    fingerMap.set(itemFingerprint(item), idx);
  });

  for (const guestItem of guestCart) {
    const fp = itemFingerprint(guestItem);
    const existingIdx = fingerMap.get(fp);

    if (existingIdx !== undefined) {
      const existing = merged[existingIdx];
      const unitPrice = existing.totalPrice / existing.quantity;
      existing.quantity += guestItem.quantity;
      existing.totalPrice = unitPrice * existing.quantity;
    } else {
      fingerMap.set(fp, merged.length);
      merged.push({ ...guestItem });
    }
  }

  return merged;
};

const getActiveKey = (userId: string | null): string =>
  userId ? getCartKey(userId) : GUEST_CART_KEY;

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const userIdRef = useRef<string | null>(null);

  const persist = useCallback((newItems: CartItem[]) => {
    saveCartToStorage(getActiveKey(userIdRef.current), newItems);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;

      if (uid) {
        const guestCart = loadCart(GUEST_CART_KEY);
        const userCart = loadCart(getCartKey(uid));

        if (guestCart.length > 0) {
          const merged = mergeCarts(guestCart, userCart);
          setItems(merged);
          saveCartToStorage(getCartKey(uid), merged);
          removeCartStorage(GUEST_CART_KEY);
        } else {
          setItems(userCart);
        }
      } else {
        setItems(loadCart(GUEST_CART_KEY));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const uid = session?.user?.id ?? null;
      const prevUid = userIdRef.current;
      userIdRef.current = uid;

      if (!uid) {
        if (prevUid) removeCartStorage(getCartKey(prevUid));
        setItems([]);
      } else if (uid !== prevUid) {
        const guestCart = loadCart(GUEST_CART_KEY);
        const userCart = loadCart(getCartKey(uid));

        if (guestCart.length > 0) {
          const merged = mergeCarts(guestCart, userCart);
          setItems(merged);
          saveCartToStorage(getCartKey(uid), merged);
          removeCartStorage(GUEST_CART_KEY);
        } else {
          setItems(userCart);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const next = [...prev, item];
      saveCartToStorage(getActiveKey(userIdRef.current), next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveCartToStorage(getActiveKey(userIdRef.current), next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      const next = quantity <= 0
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) =>
            item.id === id
              ? { ...item, quantity, totalPrice: (item.totalPrice / item.quantity) * quantity }
              : item
          );
      saveCartToStorage(getActiveKey(userIdRef.current), next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    removeCartStorage(getActiveKey(userIdRef.current));
  }, []);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
