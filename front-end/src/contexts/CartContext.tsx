/* eslint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string; // composite key: `${productId}_${selectedColor}_${selectedSize}`
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  stock: number;
  selectedColor?: string;
  selectedSize?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any, quantity?: number, color?: string, size?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalItems: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('safthoo_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('safthoo_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any, quantity = 1, color?: string, size?: number) => {
    const defaultColor = color || (product.colors && product.colors[0]) || '';
    const defaultSize = size || (product.sizes && product.sizes[0]) || 0;
    const cartItemId = `${product.id}_${defaultColor}_${defaultSize}`;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === cartItemId);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock_qty);
        return prev.map((i) =>
          i.id === cartItemId ? { ...i, quantity: newQty } : i
        );
      }
      return [...prev, {
        id: cartItemId,
        productId: product.id,
        name: product.name,
        price: product.current_price,
        quantity: Math.min(quantity, product.stock_qty),
        imageUrl: product.image_url,
        stock: product.stock_qty,
        selectedColor: defaultColor,
        selectedSize: defaultSize
      }];
    });

    // Auto open cart drawer for premium user feedback
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === cartItemId) {
          const validQty = Math.min(Math.max(1, quantity), i.stock);
          return { ...i, quantity: validQty };
        }
        return i;
      })
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      subtotal, 
      totalItems, 
      isCartOpen, 
      setIsCartOpen,
      isWishlistOpen,
      setIsWishlistOpen
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
