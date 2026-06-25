import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Heart, HeartBreak } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToWishlist, toggleWishlist } from '../services/checkoutService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function WishlistDrawer() {
  const { isWishlistOpen, setIsWishlistOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Subscribe to real-time wishlist updates from Firestore
  useEffect(() => {
    if (!user) {
      setWishlistIds([]);
      setWishlistItems([]);
      return;
    }

    const unsubscribe = subscribeToWishlist(user.uid, async (ids) => {
      setWishlistIds(ids);

      if (ids.length === 0) {
        setWishlistItems([]);
        return;
      }

      setLoading(true);
      try {
        const productPromises = ids.map(async (id) => {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { id, ...docSnap.data() };
          }
          return null;
        });
        const products = await Promise.all(productPromises);
        setWishlistItems(products.filter((p) => p !== null));
      } catch (err) {
        console.error("Failed to load favorite items", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleRemove = async (productId: string) => {
    if (!user) return;
    try {
      await toggleWishlist(user.uid, productId);
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
    }
  };

  const handleViewDetails = (productId: string) => {
    setIsWishlistOpen(false);
    navigate(`/product/${productId}`);
  };

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <>
          {/* Dark overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWishlistOpen(false)}
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
              <span className="font-black tracking-widest text-xs uppercase text-ink flex items-center gap-1.5">
                <Heart size={14} weight="bold" /> WISHLIST ({wishlistIds.length})
              </span>
              <button
                onClick={() => setIsWishlistOpen(false)}
                className="p-1 hover:bg-surface text-ink transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {!user ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-steel mb-4">
                    Please log in to save your favorite products.
                  </p>
                  <button
                    onClick={() => {
                      setIsWishlistOpen(false);
                      navigate('/login');
                    }}
                    className="border border-black px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    LOGIN
                  </button>
                </div>
              ) : loading && wishlistItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
                  <span className="text-[9px] text-steel font-black uppercase tracking-widest animate-pulse">Loading wishlist...</span>
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-surface border border-whisper flex items-center justify-center text-steel mb-4">
                    <Heart size={22} weight="bold" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-steel">Your Wishlist is Empty</p>
                  <button
                    onClick={() => setIsWishlistOpen(false)}
                    className="mt-4 border border-black px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                wishlistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b border-whisper/40 last:border-0 items-center"
                  >
                    {/* Photo */}
                    <div 
                      onClick={() => handleViewDetails(item.id)}
                      className="w-16 h-16 bg-surface border border-whisper overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <h4 
                        onClick={() => handleViewDetails(item.id)}
                        className="font-bold text-[11px] uppercase tracking-wider text-ink truncate cursor-pointer hover:text-steel transition-colors"
                      >
                        {item.name}
                      </h4>
                      <span className="text-[8px] font-black uppercase tracking-widest text-steel">
                        {item.category || 'Sneakers'}
                      </span>
                      <span className="text-[10px] font-black text-ink mt-0.5">
                        Rp {item.current_price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(item.id)}
                        className="border border-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all cursor-pointer rounded-none"
                      >
                        VIEW DETAILS
                      </button>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <HeartBreak size={15} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
