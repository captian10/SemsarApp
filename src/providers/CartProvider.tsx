// providers/CartProvider.tsx
import { useInsertOrderItems } from "@api/order-items";
import { useInsertOrder } from "@api/orders";
import type { Tables } from "@database.types";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Alert } from "react-native";
import type { CartItem } from "../types/types";

type Product = Tables<"products">;

const DEFAULT_SIZE = "M" as CartItem["size"];

type AddItemOptions = {
  size?: CartItem["size"];
  unitPrice?: number; // ✅ سعر الـ size المختار
};

type CartType = {
  items: CartItem[];
  itemsCount: number;

  // old: addItem(product, "L")
  // new: addItem(product, { size:"L", unitPrice: 120 })
  addItem: (
    product: Product,
    sizeOrOpts?: CartItem["size"] | AddItemOptions
  ) => void;

  updateQuantity: (itemId: string, amount: -1 | 1) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;

  total: number;

  isCheckingOut: boolean;
  checkout: () => Promise<void>;
};

const CartContext = createContext<CartType>({
  items: [],
  itemsCount: 0,
  addItem: () => {},
  updateQuantity: () => {},
  setQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  total: 0,
  isCheckingOut: false,
  checkout: async () => {},
});

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const CartProvider = ({ children }: PropsWithChildren) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const router = useRouter();

  const { mutate: insertOrder } = useInsertOrder();
  const { mutate: insertOrderItems } = useInsertOrderItems();

  // ✅ lock ضد double checkout
  const checkoutLock = useRef(false);

  const addItem: CartType["addItem"] = (product, sizeOrOpts) => {
    const opts: AddItemOptions =
      typeof sizeOrOpts === "string"
        ? { size: sizeOrOpts }
        : (sizeOrOpts ?? {});

    const finalSize = (opts.size ?? DEFAULT_SIZE) as CartItem["size"];

    const unitPrice =
      typeof opts.unitPrice === "number" && Number.isFinite(opts.unitPrice)
        ? opts.unitPrice
        : undefined;

    // ✅ لو اتبعت unitPrice: نخليه سعر المنتج داخل الكارت (للحسابات)
    const productForCart =
      unitPrice != null ? ({ ...product, price: unitPrice } as Product) : product;

    setItems((prev) => {
      const idx = prev.findIndex(
        (it) => it.product_id === productForCart.id && it.size === finalSize
      );

      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }

      const newItem: CartItem = {
        id: randomUUID(),
        product: productForCart,
        product_id: productForCart.id,
        size: finalSize,
        quantity: 1,
      };

      return [...prev, newItem];
    });
  };

  const updateQuantity: CartType["updateQuantity"] = (itemId, amount) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + amount } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const setQuantity: CartType["setQuantity"] = (itemId, quantity) => {
    const q = Math.max(0, Math.floor(quantity));
    setItems((prev) =>
      prev
        .map((item) => (item.id === itemId ? { ...item, quantity: q } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem: CartType["removeItem"] = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => setItems([]);

  const total = useMemo(() => {
    const t = items.reduce(
      (sum, item) =>
        sum + Number(item.product.price ?? 0) * Number(item.quantity ?? 0),
      0
    );
    return round2(t);
  }, [items]);

  const itemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  }, [items]);

  const checkout: CartType["checkout"] = async () => {
    if (checkoutLock.current || isCheckingOut) return;

    if (!items.length) {
      Alert.alert("السلة فاضية", "ضيف منتجات الأول قبل ما تعمل طلب.");
      return;
    }

    checkoutLock.current = true;
    setIsCheckingOut(true);

    try {
      // ✅ snapshot
      const snapshotItems = [...items];
      const snapshotTotal = round2(
        snapshotItems.reduce(
          (sum, item) =>
            sum + Number(item.product.price ?? 0) * Number(item.quantity ?? 0),
          0
        )
      );

      // 1) Create order (✅ user_id بياخده الهوك من session)
      const order = await new Promise<Tables<"orders"> | null>((resolve, reject) => {
        insertOrder(
          { total: snapshotTotal } as any,
          {
            onSuccess: (o) => resolve(o),
            onError: (e) => reject(e),
          }
        );
      });

      const orderId = Number(order?.id);
      if (!orderId || !Number.isFinite(orderId)) {
        Alert.alert("خطأ", "لم يتم إنشاء الطلب بشكل صحيح.");
        return;
      }

      // 2) Prepare order items (✅ unit_price موجود عندك + NOT NULL)
      const orderItems = snapshotItems.map((cartItem) => {
        const unitPrice = Number(cartItem.product.price ?? 0);

        return {
          order_id: orderId,
          product_id: Number(cartItem.product_id),
          quantity: Number(cartItem.quantity ?? 0),
          size: String(cartItem.size ?? DEFAULT_SIZE),
          unit_price: unitPrice,
        };
      });

      // 3) Insert order items
      await new Promise<void>((resolve, reject) => {
        insertOrderItems(orderItems as any, {
          onSuccess: () => resolve(),
          onError: (e) => reject(e),
        });
      });

      clearCart();
      router.push(`/(user)/orders/${orderId}`);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حصلت مشكلة أثناء إنشاء الطلب.");
    } finally {
      checkoutLock.current = false;
      setIsCheckingOut(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemsCount,
        addItem,
        updateQuantity,
        setQuantity,
        removeItem,
        clearCart,
        total,
        isCheckingOut,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
export const useCart = () => useContext(CartContext);
