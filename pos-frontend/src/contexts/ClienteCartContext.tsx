import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Producto } from '../types';
import { safeParseJson } from '../utils/json';

export type CartItem = { producto: Producto; cantidad: number };

type ClienteCartContextType = {
  items: CartItem[];
  addItem: (producto: Producto, cantidad?: number) => void;
  removeItem: (productoId: number) => void;
  setCantidad: (productoId: number, cantidad: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const STORAGE_KEY = 'cliente_cart';

const ClienteCartContext = createContext<ClienteCartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  setCantidad: () => {},
  clear: () => {},
  total: 0,
  count: 0
});

export const ClienteCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const parsed = safeParseJson<CartItem[]>(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) {
      setItems(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (producto: Producto, cantidad = 1) => {
    const qty = Math.max(1, Number(cantidad) || 1);
    setItems(prev => {
      const existing = prev.find(i => i.producto.id === producto.id);
      if (!existing) return [...prev, { producto, cantidad: qty }];
      return prev.map(i =>
        i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + qty } : i
      );
    });
  };

  const removeItem = (productoId: number) => {
    setItems(prev => prev.filter(i => i.producto.id !== productoId));
  };

  const setCantidad = (productoId: number, cantidad: number) => {
    const qty = Math.max(0, Number(cantidad) || 0);
    setItems(prev => {
      if (qty === 0) return prev.filter(i => i.producto.id !== productoId);
      return prev.map(i => (i.producto.id === productoId ? { ...i, cantidad: qty } : i));
    });
  };

  const clear = () => setItems([]);

  const total = useMemo(
    () => items.reduce((acc, i) => acc + Number(i.producto.precioVenta || 0) * i.cantidad, 0),
    [items]
  );
  const count = useMemo(() => items.reduce((acc, i) => acc + i.cantidad, 0), [items]);

  const value = useMemo<ClienteCartContextType>(
    () => ({ items, addItem, removeItem, setCantidad, clear, total, count }),
    [items, total, count]
  );

  return <ClienteCartContext.Provider value={value}>{children}</ClienteCartContext.Provider>;
};

export const useClienteCart = () => useContext(ClienteCartContext);
