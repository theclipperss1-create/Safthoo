import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { X, Trash, ArrowRight, ShoppingCartSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, subtotal, totalItems, isCartOpen, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Dark overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black z-50 cursor-pointer"
          />

          {/* Slide-out Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-whisper z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-whisper">
              <span className="font-black tracking-widest text-xs uppercase text-ink">
                KERANJANG BELANJA ({totalItems})
              </span>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-surface text-ink transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-surface border border-whisper flex items-center justify-center text-steel mb-4">
                    <ShoppingCartSimple size={22} weight="bold" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-steel">Keranjang Anda Kosong</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 border border-black px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    Mulai Belanja
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b border-whisper/40 last:border-0 items-center"
                  >
                    {/* Image */}
                    <div className="w-16 h-16 bg-surface border border-whisper overflow-hidden shrink-0">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-ink truncate">
                        {item.name}
                      </h4>
                      {(item.selectedColor || item.selectedSize) && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-steel leading-none">
                          {item.selectedColor && `Warna: ${item.selectedColor}`}
                          {item.selectedColor && item.selectedSize ? ' | ' : ''}
                          {item.selectedSize ? `Size: ${item.selectedSize}` : ''}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-ink mt-0.5">
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Qty and Remove */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface border border-whisper text-xs font-bold">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-whisper text-ink cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-[10px] font-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-7 h-7 flex items-center justify-center hover:bg-whisper text-ink disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-6 border-t border-whisper bg-surface flex flex-col gap-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-steel">Subtotal Belanja</span>
                  <span className="text-black text-xs">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <p className="text-[8px] text-steel font-bold uppercase tracking-widest leading-normal">
                  Pajak &amp; pengiriman simulasi gratis. Kunci stok saat checkout.
                </p>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-black text-white py-4 font-black uppercase tracking-widest text-[10px] hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Lanjut ke Pembayaran <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
