import { doc, runTransaction, collection, updateDoc, onSnapshot, getDoc, setDoc, arrayUnion, query, where, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CartItem } from '../contexts/CartContext';

export interface ShippingDetails {
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  shippingMethod: string;
  shippingCost: number;
}

export interface SavedAddress {
  label: string; // e.g. "RUMAH", "KANTOR"
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

// 1. Checkout Cart with Promo Code support
export const checkoutCart = async (
  userId: string, 
  items: CartItem[], 
  subtotal: number, 
  shippingDetails: ShippingDetails, 
  notes: string,
  promoCode: string = '',
  discountAmount: number = 0
) => {
  return await runTransaction(db, async (transaction) => {
    // Validate stocks
    const productRefs = items.map(item => doc(db, 'products', item.productId));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

    const updates = [];
    for (let i = 0; i < productDocs.length; i++) {
      const pDoc = productDocs[i];
      if (!pDoc.exists()) throw new Error(`Product ${items[i].name} not found`);
      
      const stock = pDoc.data().stock_qty;
      if (stock < items[i].quantity) {
        throw new Error(`Stok tidak cukup untuk ${items[i].name} (Sisa: ${stock})`);
      }
      updates.push({ ref: productRefs[i], newStock: stock - items[i].quantity });
    }

    // Deduct stocks
    for (const update of updates) {
      transaction.update(update.ref, { stock_qty: update.newStock });
    }

    // Calculate final totals
    const serviceFee = 1000;
    const finalTotal = Math.max(0, subtotal + shippingDetails.shippingCost + serviceFee - discountAmount);
    const orderRef = doc(collection(db, 'orders'));
    
    transaction.set(orderRef, {
      user_id: userId,
      subtotal_amount: subtotal,
      shipping_cost: shippingDetails.shippingCost,
      shipping_method: shippingDetails.shippingMethod,
      service_fee: serviceFee,
      promo_code: promoCode,
      discount_amount: discountAmount,
      total_amount: finalTotal,
      recipient_name: shippingDetails.recipientName,
      phone: shippingDetails.phone,
      address: shippingDetails.address,
      city: shippingDetails.city,
      postal_code: shippingDetails.postalCode,
      notes: notes,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Create Order Items
    for (const item of items) {
      const orderItemRef = doc(collection(db, 'order_items'));
      transaction.set(orderItemRef, {
        order_id: orderRef.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        color: item.selectedColor || '',
        size: item.selectedSize || 0
      });
    }

    // Create Payment (Simulated QRIS)
    const paymentRef = doc(collection(db, 'payments'));
    transaction.set(paymentRef, {
      order_id: orderRef.id,
      status: 'pending',
      qr_payload: '00020101021126570011ID.CO.QRIS.WWW01189360000000000000000214' + orderRef.id,
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      paid_at: null
    });

    return { orderId: orderRef.id, paymentId: paymentRef.id };
  });
};

export const simulatePaymentSuccess = async (paymentId: string, orderId: string) => {
  await updateDoc(doc(db, 'payments', paymentId), {
    status: 'paid',
    paid_at: new Date().toISOString()
  });
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'paid'
  });
};

// Realtime listener for payment
export const subscribeToPayment = (paymentId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, 'payments', paymentId), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// 2. Address Book Services
export const saveUserAddress = async (userId: string, address: SavedAddress) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const currentAddresses = userSnap.data().saved_addresses || [];
    // Avoid exact address duplicates
    const exists = currentAddresses.some((addr: SavedAddress) => 
      addr.label.toUpperCase() === address.label.toUpperCase() ||
      (addr.address === address.address && addr.city === address.city)
    );
    if (!exists) {
      await updateDoc(userRef, {
        saved_addresses: arrayUnion(address)
      });
    }
  } else {
    await setDoc(userRef, {
      saved_addresses: [address]
    });
  }
};

export const getUserAddresses = async (userId: string): Promise<SavedAddress[]> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().saved_addresses || [];
  }
  return [];
};

// 3. Wishlist Services
export const toggleWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const q = query(
    collection(db, 'wishlists'),
    where('user_id', '==', userId),
    where('product_id', '==', productId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    // Exists, so remove it
    await deleteDoc(snap.docs[0].ref);
    return false; // Removed
  } else {
    // Add to wishlist
    await addDoc(collection(db, 'wishlists'), {
      user_id: userId,
      product_id: productId,
      created_at: new Date().toISOString()
    });
    return true; // Added
  }
};

export const subscribeToWishlist = (userId: string, callback: (productIds: string[]) => void) => {
  const q = query(
    collection(db, 'wishlists'),
    where('user_id', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const ids = snapshot.docs.map(doc => doc.data().product_id as string);
    callback(ids);
  });
};
