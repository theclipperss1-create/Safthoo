import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Product {
  id: string;
  name: string;
  description: string;
  current_price: number;
  stock_qty: number;
  image_url: string;
  category: string;
  colors?: string[];
  sizes?: number[];
  is_active: boolean;
}

export const getProducts = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('is_active', '==', true));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

export const subscribeProducts = (callback: (products: Product[]) => void) => {
  const productsRef = collection(db, 'products');
  const q = query(productsRef, where('is_active', '==', true));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    callback(products);
  }, (error) => {
    console.error("Error subscribing to products:", error);
  });
};
