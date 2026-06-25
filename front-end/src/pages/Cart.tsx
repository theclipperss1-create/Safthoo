import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Trash, ArrowLeft, ArrowRight, ShoppingCartSimple } from '@phosphor-icons/react';
import { subscribeProducts } from '../services/productService';
import type { Product } from '../services/productService';
import { goeyToast as toast } from 'goey-toast';
import { motion } from 'framer-motion';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);

  // Listen to product list updates in real-time to watch for stock changes
  useEffect(() => {
    const unsubscribe = subscribeProducts((data) => {
      setDbProducts(data);
    });
    return () => unsubscribe();
  }, []);

  // Sync cart items quantities when DB stocks change
  useEffect(() => {
    if (dbProducts.length === 0 || items.length === 0) return;

    items.forEach(item => {
      const dbProd = dbProducts.find(p => p.id === item.productId);
      if (dbProd) {
        // If product is inactive or deleted from catalog
        if (!dbProd.is_active) {
          toast.warning(`Produk ${item.name} sudah tidak tersedia.`);
          removeFromCart(item.id);
          return;
        }

        // If stock has decreased below the cart's selected quantity
        if (dbProd.stock_qty < item.quantity) {
          if (dbProd.stock_qty <= 0) {
            toast.warning(`Stok ${item.name} habis.`);
            removeFromCart(item.id);
          } else {
            toast.warning(`Stok berubah. Jumlah ${item.name} disesuaikan ke ${dbProd.stock_qty}.`);
            updateQuantity(item.id, dbProd.stock_qty);
          }
        }
      }
    });
  }, [dbProducts, items, removeFromCart, updateQuantity]);

  const handleCheckout = () => {
    if (!user) {
      // Redirect to login first, then proceed to checkout
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center p-6 text-ink"
      >
        <div className="text-center max-w-sm flex flex-col items-center">
          <div className="w-12 h-12 bg-surface border border-whisper flex items-center justify-center text-steel mb-6">
            <ShoppingCartSimple size={24} weight="bold" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-widest mb-2">Keranjang Kosong</h1>
          <p className="text-steel text-xs font-medium mb-8 leading-relaxed">Belum ada barang di keranjang Anda. Jelajahi koleksi sepatu premium kami.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3.5 font-bold text-xs uppercase tracking-widest hover:bg-neutral-900 transition-colors">
            <ArrowLeft weight="bold" size={12} /> Kembali ke Katalog
          </Link>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="min-h-[100dvh] bg-canvas text-ink pb-24"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-whisper">
        <div className="flex items-center gap-4 px-6 py-4 max-w-2xl mx-auto w-full">
          <Link to="/" className="p-2 -ml-2 text-steel hover:text-ink transition-colors">
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <h1 className="text-base font-black uppercase tracking-widest">KERANJANG ({totalItems})</h1>
        </div>
      </header>

      {/* Cart Container */}
      <section className="max-w-2xl mx-auto p-6 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {items.map(item => {
            const dbProd = dbProducts.find(p => p.id === item.productId);
            const currentStock = dbProd ? dbProd.stock_qty : item.stock;

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id} 
                className="flex gap-4 p-4 bg-white border border-whisper items-center"
              >
                {/* Product Image */}
                <div className="w-20 h-20 bg-surface overflow-hidden shrink-0 border border-whisper/60">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <h3 className="font-bold text-ink text-xs uppercase tracking-wider truncate">{item.name}</h3>
                  {(item.selectedColor || item.selectedSize) && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-steel">
                      {item.selectedColor && `Warna: ${item.selectedColor}`}
                      {item.selectedColor && item.selectedSize ? ' | ' : ''}
                      {item.selectedSize ? `Size: ${item.selectedSize}` : ''}
                    </span>
                  )}
                  <span className="text-xs font-black text-ink">
                    Rp {item.price.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-surface border border-whisper">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-whisper text-ink transition-colors font-bold text-sm cursor-pointer"
                    >-</button>
                    <span className="w-9 text-center text-xs font-bold text-ink">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= currentStock}
                      className="w-9 h-9 flex items-center justify-center hover:bg-whisper text-ink disabled:opacity-30 transition-colors font-bold text-sm cursor-pointer"
                    >+</button>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    title="Hapus Item"
                  >
                    <Trash size={18} weight="bold" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Subtotal Card */}
        <div className="bg-white border border-whisper p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
            <span className="text-steel">Subtotal Belanja</span>
            <span className="text-sm text-black">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <p className="text-[9px] text-steel font-bold uppercase tracking-widest leading-normal">Pajak &amp; pengiriman simulasi gratis. Stok produk dikunci saat transaksi dibuat.</p>
          
          <button 
            onClick={handleCheckout}
            className="w-full bg-black text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            Lanjut ke Pembayaran <ArrowRight weight="bold" size={14} />
          </button>
        </div>
      </section>
    </motion.main>
  );
}
