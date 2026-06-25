import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeProducts } from '../services/productService';
import { subscribeToWishlist, toggleWishlist } from '../services/checkoutService';
import type { Product } from '../services/productService';
import { ArrowLeft, ShoppingCart, Check, Minus, Plus, Heart, Star, Chat } from '@phosphor-icons/react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { goeyToast as toast } from 'goey-toast';

const colorHexMap: Record<string, string> = {
  'Obsidian Black': '#111111',
  'Chalk White': '#F6F6F6',
  'Slate Grey': '#767677',
  'Sage Green': '#84A98C',
  'Earthy Ochre': '#C89F53',
  'Midnight Navy': '#0F172A',
  'Crimson Rust': '#991B1B',
  'Sand Beige': '#E5D5C5',
  'Charcoal Grey': '#27272A'
};

const colorImageMap: Record<string, string> = {
  'Obsidian Black': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  'Chalk White': 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
  'Slate Grey': 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
  'Sage Green': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
  'Earthy Ochre': 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
  'Midnight Navy': 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=800&q=80',
  'Crimson Rust': 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80',
  'Sand Beige': 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80',
  'Charcoal Grey': 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=800&q=80'
};

const getStarsString = (rating: number) => {
  const rounded = Math.round(rating);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, totalItems, setIsCartOpen, setIsWishlistOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selections
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Hover Zoom Coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Collapsible accordion state
  const [openSection, setOpenSection] = useState<string | null>('desc');

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  // Size advisor modal states
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [advisorBrand, setAdvisorBrand] = useState('nike');
  const [advisorSize, setAdvisorSize] = useState(40);
  const [recommendedSizeResult, setRecommendedSizeResult] = useState<number | null>(null);

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const isFavorited = id ? wishlistIds.includes(id) : false;

  // Real-time Reviews State from Firestore
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newReviewName, setNewReviewName] = useState(user?.displayName || '');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewSizeFit, setNewReviewSizeFit] = useState<'kekecilan' | 'pas' | 'kebesaran'>('pas');

  // Scroll Progress Bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Calculate size recommendations
  const calculateRecommendedSize = () => {
    if (advisorBrand === 'nike') {
      setRecommendedSizeResult(advisorSize); // True to size
    } else if (advisorBrand === 'adidas') {
      setRecommendedSizeResult(advisorSize);
    } else if (advisorBrand === 'converse') {
      setRecommendedSizeResult(advisorSize + 1);
    }
  };

  // Subscribe to wishlist updates
  useEffect(() => {
    if (!user) {
      setWishlistIds([]);
      return;
    }
    const unsubscribe = subscribeToWishlist(user.uid, (ids) => {
      setWishlistIds(ids);
    });
    return () => unsubscribe();
  }, [user]);

  // Subscribe to real-time reviews from Firestore
  useEffect(() => {
    if (!id) return;
    setLoadingReviews(true);

    const q = query(
      collection(db, 'reviews'),
      where('product_id', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort reviews by created_at descending
      reviewData.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setReviews(reviewData);
      setLoadingReviews(false);
    }, (error) => {
      console.error("Gagal berlangganan ulasan real-time", error);
      setLoadingReviews(false);
    });

    return () => unsubscribe();
  }, [id]);

  // Subscribe to this specific product in real-time
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    const docRef = doc(db, 'products', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Product;
        setProduct(data);
        
        // Auto-select first color/size if not selected yet
        if (data.colors && data.colors.length > 0 && !selectedColor) {
          setSelectedColor(data.colors[0]);
        }
        if (data.sizes && data.sizes.length > 0 && selectedSize === null) {
          setSelectedSize(data.sizes[0]);
        }
      } else {
        toast.error("Produk tidak ditemukan");
        navigate('/');
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error subscribing to product:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate, selectedColor, selectedSize]);

  // Fetch recommendations of the same category
  useEffect(() => {
    if (!product) return;
    const unsubscribe = subscribeProducts((data) => {
      const filtered = data.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
      setRecommendations(filtered);
    });
    return () => unsubscribe();
  }, [product]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleAddToCart = () => {
    if (!product || product.stock_qty <= 0) return;
    if (!selectedColor) {
      toast.warning("Silakan pilih warna terlebih dahulu.");
      return;
    }
    if (selectedSize === null) {
      toast.warning("Silakan pilih ukuran terlebih dahulu.");
      return;
    }

    setIsAdding(true);
    addToCart(product, quantity, selectedColor, selectedSize);
    toast.success(`${quantity}x ${product.name} (${selectedColor}, Size ${selectedSize}) masuk ke keranjang!`);
    
    setTimeout(() => {
      setIsAdding(false);
    }, 400);
  };

  const handleToggleWishlist = async () => {
    if (!user || !id) {
      toast.warning("Silakan masuk akun terlebih dahulu.");
      return;
    }
    try {
      const added = await toggleWishlist(user.uid, id);
      if (added) {
        toast.success(`${product?.name} disimpan ke favorit`);
      } else {
        toast.success(`${product?.name} dihapus dari favorit`);
      }
    } catch (err) {
      console.error("Gagal mengubah wishlist", err);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) {
      toast.warning("Nama dan komentar ulasan harus diisi.");
      return;
    }
    
    try {
      await addDoc(collection(db, 'reviews'), {
        product_id: id,
        name: newReviewName.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        size_fit: newReviewSizeFit,
        created_at: new Date().toISOString()
      });
      
      setNewReviewComment('');
      setNewReviewRating(5);
      setNewReviewSizeFit('pas');
      toast.success("Ulasan Anda berhasil dikirim!");
    } catch (err) {
      console.error("Gagal mengirim ulasan", err);
      toast.error("Gagal mengirim ulasan. Silakan coba lagi.");
    }
  };

  // Review & Rating Calculations
  const totalReviews = reviews.length;
  
  // Calculate dynamic average rating
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  // Calculate dynamic star counts for distribution
  const starCounts = [0, 0, 0, 0, 0]; // 1s to 5s
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      starCounts[r.rating - 1]++;
    }
  });

  const starPercentages = starCounts.map(count => 
    totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
  );

  // Calculate size fit statistics
  let sizeFitSum = 0;
  let sizeFitCount = 0;
  reviews.forEach(r => {
    if (r.size_fit === 'kekecilan') {
      sizeFitSum -= 1;
      sizeFitCount++;
    } else if (r.size_fit === 'pas') {
      sizeFitCount++;
    } else if (r.size_fit === 'kebesaran') {
      sizeFitSum += 1;
      sizeFitCount++;
    }
  });

  const sizeFitAvg = sizeFitCount > 0 ? sizeFitSum / sizeFitCount : 0;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-canvas text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
          <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Memuat detail produk...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="w-full max-w-full overflow-x-hidden min-h-[100dvh] bg-canvas text-ink flex flex-col pb-24"
    >
      {/* Stark Minimal Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3px] bg-black origin-left z-50 pointer-events-none" 
        style={{ scaleX }} 
      />

      {/* Stark Minimal Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-whisper">
        <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-steel hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} weight="bold" /> Kembali
          </button>
          
          <span 
            className="font-black tracking-widest text-lg md:text-xl cursor-pointer uppercase"
            onClick={() => navigate('/')}
          >
            Safthoo
          </span>

          <div className="flex items-center gap-3">
            {/* Wishlist Trigger */}
            {user && (
              <button 
                onClick={() => setIsWishlistOpen(true)}
                className="relative p-2 text-steel hover:text-ink transition-colors cursor-pointer"
                title="Daftar Keinginan"
              >
                <Heart size={20} weight="bold" />
                {wishlistIds.length > 0 && (
                  <motion.span 
                    key={wishlistIds.length}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center"
                  >
                    {wishlistIds.length}
                  </motion.span>
                )}
              </button>
            )}

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-steel hover:text-ink transition-colors cursor-pointer"
              title="Keranjang Belanja"
            >
              <ShoppingCart size={20} weight="bold" />
              {totalItems > 0 && (
                <motion.span 
                  key={totalItems}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Main Split Screen Container */}
      <section className="pt-6 sm:pt-12 px-4 sm:px-6 max-w-7xl w-full mx-auto flex-1 flex flex-col md:grid md:grid-cols-2 md:gap-16 items-start">
        {/* Left: Product Image with Interactive Zoom Pan */}
        <div 
          className="w-full aspect-[4/5] bg-surface border border-whisper/30 overflow-hidden relative md:cursor-zoom-in group pointer-events-none md:pointer-events-auto shadow-sm"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img
            src={(selectedColor && colorImageMap[selectedColor]) || product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'}
            alt={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-150 ease-out"
            style={{
              transform: isHovered ? 'scale(1.4)' : 'scale(1)',
              transformOrigin: `${mousePos.x}% ${mousePos.y}%`
            }}
          />
          {product.stock_qty <= 0 ? (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
              <span className="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest">Stok Habis</span>
            </div>
          ) : (
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 border border-white/10 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none hidden md:block">
              Arahkan kursor untuk memperbesar
            </div>
          )}
        </div>

        {/* Right: Info and Configuration */}
        <div className="w-full flex flex-col gap-8 mt-8 md:mt-0">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-extrabold text-steel uppercase tracking-widest border border-whisper px-3 py-1 self-start bg-surface">
              {product.category}
            </span>
            <h1 className="text-3xl font-black tracking-tight text-ink uppercase leading-none mt-2">
              {product.name}
            </h1>
            <span className="text-2xl font-black text-ink mt-1">
              Rp {product.current_price.toLocaleString('id-ID')}
            </span>

            <div className="h-px bg-whisper my-4"></div>
          </div>

          {/* Configuration options if in stock */}
          {product.stock_qty > 0 ? (
            <div className="flex flex-col gap-8">
              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-black text-steel uppercase tracking-widest">PILIH WARNA: <span className="text-black">{selectedColor}</span></h4>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map((color) => {
                      const hex = colorHexMap[color] || '#cbd5e1';
                      const isSelected = selectedColor === color;
                      const isWhite = color === 'Chalk White';

                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className="relative w-8 h-8 rounded-full flex items-center justify-center border border-black/10 hover:scale-105 transition-transform cursor-pointer focus:outline-none"
                          style={{ backgroundColor: hex }}
                          title={color}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="activeColorBorder"
                              className={`absolute inset-[-4px] rounded-full border-2 border-black`}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            />
                          )}
                          {isSelected && (
                            <Check
                              size={12}
                              weight="bold"
                              className={isWhite ? 'text-black' : 'text-white'}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-steel uppercase tracking-widest">PILIH UKURAN (EU): <span className="text-black">{selectedSize}</span></h4>
                    <button 
                      onClick={() => setIsSizeModalOpen(true)}
                      className="text-[9px] font-black uppercase tracking-widest text-steel hover:text-black underline cursor-pointer focus:outline-none"
                    >
                      PANDUAN UKURAN
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {product.sizes.map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <motion.button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`h-12 border text-xs font-bold flex items-center justify-center cursor-pointer focus:outline-none ${
                            isSelected
                              ? 'bg-black border-black text-white'
                              : 'bg-white border-whisper text-steel hover:border-black hover:text-black'
                          }`}
                        >
                          {size}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selection */}
              <div className="flex items-center justify-between border-t border-b border-whisper py-4 mt-2">
                <span className="font-bold text-steel text-xs uppercase tracking-widest">Jumlah</span>
                <div className="flex items-center bg-surface border border-whisper">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center hover:bg-whisper text-ink disabled:opacity-30 transition-colors font-bold cursor-pointer"
                  >
                    <Minus size={12} weight="bold" />
                  </button>
                  <span className="w-12 text-center text-xs font-black text-ink">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock_qty, q + 1))}
                    disabled={quantity >= product.stock_qty}
                    className="w-10 h-10 flex items-center justify-center hover:bg-whisper text-ink disabled:opacity-30 transition-colors font-bold cursor-pointer"
                  >
                    <Plus size={12} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Stock Info */}
              <div className="flex justify-between items-center text-[10px] font-black text-steel uppercase tracking-widest">
                <span>STATUS STOK:</span>
                <span>
                  {product.stock_qty < 5 ? (
                    <span className="text-red-600 font-black">HANYA TERSISA {product.stock_qty} UNIT!</span>
                  ) : (
                    <span className="text-black">TERSEDIA ({product.stock_qty})</span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-whisper p-5 text-center">
              <p className="text-xs text-black font-black uppercase tracking-widest">Produk Habis Terjual</p>
              <p className="text-xs text-steel mt-1 font-medium leading-relaxed">Stok produk ini sedang kosong. Silakan periksa kembali nanti.</p>
            </div>
          )}

          {/* Action CTA & Wishlist Button */}
          <div className="flex gap-3 mt-4">
            <motion.button
              onClick={handleAddToCart}
              disabled={product.stock_qty <= 0 || isAdding}
              whileHover={{ scale: product.stock_qty > 0 && !isAdding ? 1.015 : 1 }}
              whileTap={{ scale: product.stock_qty > 0 && !isAdding ? 0.985 : 1 }}
              className="flex-1 bg-black text-white py-4 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg rounded-none"
            >
              {isAdding ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : product.stock_qty <= 0 ? (
                'Stok Habis'
              ) : (
                'Masukkan ke Keranjang'
              )}
            </motion.button>

            {/* Premium Wishlist Heart Button */}
            {user && (
              <motion.button
                type="button"
                onClick={handleToggleWishlist}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 border border-whisper bg-white hover:border-black text-black flex items-center justify-center cursor-pointer transition-colors shadow-sm rounded-none"
                title="Simpan ke Favorit"
              >
                <Heart 
                  size={20} 
                  weight={isFavorited ? 'fill' : 'bold'} 
                  className={isFavorited ? 'text-black' : 'text-steel'}
                />
              </motion.button>
            )}
          </div>

          {/* Nike-Style Accordions */}
          <div className="flex flex-col border-t border-whisper mt-4">
            {/* Description Accordion */}
            <div className="border-b border-whisper">
              <button 
                onClick={() => toggleSection('desc')}
                className="w-full py-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-ink hover:text-steel transition-colors focus:outline-none cursor-pointer"
              >
                <span>DESKRIPSI & DETAIL</span>
                <span className="text-xs font-bold">{openSection === 'desc' ? '—' : '+'}</span>
              </button>
              <AnimatePresence initial={false}>
                {openSection === 'desc' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-4"
                  >
                    <p className="text-xs text-steel leading-relaxed font-medium">
                      {product.description} Terbuat dari bahan sintetis berkinerja tinggi serta sol karet divulkanisasi untuk mencengkeram medan apa pun secara dinamis.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shipping Info Accordion */}
            <div className="border-b border-whisper">
              <button 
                onClick={() => toggleSection('shipping')}
                className="w-full py-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-ink hover:text-steel transition-colors focus:outline-none cursor-pointer"
              >
                <span>PENGIRIMAN & PENGEMBALIAN GRATIS</span>
                <span className="text-xs font-bold">{openSection === 'shipping' ? '—' : '+'}</span>
              </button>
              <AnimatePresence initial={false}>
                {openSection === 'shipping' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-4"
                  >
                    <p className="text-xs text-steel leading-relaxed font-medium">
                      Pengiriman standar gratis untuk semua transaksi simulasi QRIS. Pengembalian barang dapat dilakukan dalam waktu 30 hari sejak tanggal pembelian tanpa dikenakan biaya tambahan.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced Reviews Accordion with Rating Breakdown & Size Fit */}
            <div className="border-b border-whisper">
              <button 
                onClick={() => toggleSection('reviews')}
                 className="w-full py-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-ink hover:text-steel transition-colors focus:outline-none cursor-pointer"
               >
                 <span>ULASAN ({totalReviews}) • {getStarsString(Number(averageRating))} {averageRating}</span>
                 <span className="text-xs font-bold">{openSection === 'reviews' ? '—' : '+'}</span>
              </button>
              <AnimatePresence initial={false}>
                {openSection === 'reviews' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-4 flex flex-col gap-6"
                  >
                    
                    {/* Visual Analytics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-whisper pb-6 pt-2">
                      
                      {/* Rating Distribution Progress Bars */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black tracking-widest text-steel">DISTRIBUSI RATING</span>
                        <div className="flex flex-col gap-1.5">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const percent = starPercentages[stars - 1];
                            return (
                              <div key={stars} className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-steel">
                                <span className="w-12">{stars} Bintang</span>
                                <div className="flex-1 h-1.5 bg-whisper relative">
                                  <div className="absolute top-0 left-0 h-full bg-black" style={{ width: `${percent}%` }} />
                                </div>
                                <span className="w-6 text-right">{percent}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Size Fit Indicator Slider */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black tracking-widest text-steel">KECOCOKAN UKURAN (SIZE FIT)</span>
                        <div className="h-0.5 bg-whisper relative my-4">
                          {/* Scale Markers */}
                          <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-whisper rounded-full" />
                          <div className="absolute left-[50%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-whisper rounded-full" />
                          <div className="absolute right-[10%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-whisper rounded-full" />
                          
                          {/* Active Slider Thumb */}
                          <motion.div 
                            className="absolute w-3 h-3 bg-black rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-md"
                            style={{ left: `${50 + (sizeFitAvg * 40)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-steel tracking-widest uppercase">
                          <span>Kekecilan</span>
                          <span>Pas</span>
                          <span>Kebesaran</span>
                        </div>
                        <div className="mt-2 text-center py-1.5 bg-surface border border-whisper text-[9px] font-black uppercase tracking-widest text-black">
                          {sizeFitCount === 0 ? 'Belum Ada Data Sizing' : 
                           sizeFitAvg < -0.25 ? 'Cenderung Kekecilan' : 
                           sizeFitAvg > 0.25 ? 'Cenderung Kebesaran' : 'Sesuai Ukuran (True to Size)'}
                        </div>
                      </div>

                    </div>

                    {/* Review List */}
                    <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2">
                      {loadingReviews && reviews.length === 0 ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                          <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
                          <span className="text-steel text-[9px] font-black uppercase tracking-widest">Memuat ulasan...</span>
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="text-center py-8 text-steel text-[9px] font-black uppercase tracking-widest">
                          Belum ada ulasan untuk produk ini. Jadilah yang pertama!
                        </div>
                      ) : (
                        reviews.map((r) => (
                          <div key={r.id} className="border-b border-whisper/40 pb-3 last:border-0 last:pb-0 text-left">
                            <div className="flex justify-between items-start text-[9px] font-black uppercase tracking-widest">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-black">{r.name}</span>
                                <span className="text-steel text-[8px]">UKURAN FIT: {r.size_fit || 'PAS'}</span>
                              </div>
                              <div className="text-black flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={10} weight={i < r.rating ? 'fill' : 'bold'} />
                                ))}
                              </div>
                            </div>
                            <p className="text-[10px] text-steel mt-1.5 font-medium leading-relaxed uppercase tracking-wider">{r.comment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Write a Review Form */}
                    {user ? (
                      <form onSubmit={handleAddReview} className="border-t border-whisper pt-4 flex flex-col gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1">
                          <Chat size={14} weight="bold" /> Tulis Ulasan Anda
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-steel">NAMA LENGKAP *</label>
                            <input
                              type="text"
                              placeholder="NAMA ANDA"
                              className="w-full bg-white border border-whisper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink outline-none focus:border-black rounded-none"
                              value={newReviewName}
                              onChange={(e) => setNewReviewName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-steel">RATING PENILAIAN *</label>
                            <select
                              className="w-full bg-white border border-whisper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink outline-none focus:border-black rounded-none font-sans"
                              value={newReviewRating}
                              onChange={(e) => setNewReviewRating(Number(e.target.value))}
                            >
                              <option value={5}>★★★★★ 5 BINTANG</option>
                              <option value={4}>★★★★☆ 4 BINTANG</option>
                              <option value={3}>★★★☆☆ 3 BINTANG</option>
                              <option value={2}>★★☆☆☆ 2 BINTANG</option>
                              <option value={1}>★☆☆☆☆ 1 BINTANG</option>
                            </select>
                          </div>
                        </div>

                        {/* Size Fit Selector Radio Box Group */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-steel">Kecocokan Ukuran Sepatu *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['kekecilan', 'pas', 'kebesaran'] as const).map((fit) => (
                              <button
                                key={fit}
                                type="button"
                                onClick={() => setNewReviewSizeFit(fit)}
                                className={`py-2 border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer rounded-none focus:outline-none ${
                                  newReviewSizeFit === fit
                                    ? 'bg-black border-black text-white'
                                    : 'bg-white border-whisper text-steel hover:border-black hover:text-black'
                                }`}
                              >
                                {fit}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-steel">KOMENTAR / FEEDBACK *</label>
                          <textarea
                            placeholder="ULASAN DAN FEEDBACK SNEAKER ANDA"
                            rows={2}
                            className="w-full bg-white border border-whisper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink outline-none focus:border-black resize-none rounded-none"
                            value={newReviewComment}
                            onChange={(e) => setNewReviewComment(e.target.value)}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-black text-white py-3 text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-colors self-start px-6 cursor-pointer rounded-none"
                        >
                          Kirim Ulasan
                        </button>
                      </form>
                    ) : (
                      <div className="border-t border-whisper pt-6 pb-2 text-center flex flex-col items-center gap-3">
                        <p className="text-[10px] text-steel font-black uppercase tracking-widest">Silakan masuk akun untuk menulis ulasan produk</p>
                        <button
                          type="button"
                          onClick={() => navigate('/login')}
                          className="border border-black bg-white text-black px-5 py-2 hover:bg-black hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest cursor-pointer rounded-none"
                        >
                          Masuk Akun
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Recommendation Grid (You Might Also Like) */}
      {recommendations.length > 0 && (
        <section className="mt-24 border-t border-whisper pt-16 px-6 max-w-7xl w-full mx-auto">
          <h3 className="text-xs font-black uppercase tracking-widest text-steel mb-8">ANDA JUGA MUNGKIN MENYUKAI</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recommendations.map(p => (
              <div 
                key={p.id}
                onClick={() => {
                  navigate(`/product/${p.id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group flex flex-col cursor-pointer bg-white"
              >
                <div className="aspect-square w-full overflow-hidden bg-surface border border-whisper/30 mb-3 relative">
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out" 
                  />
                </div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-ink group-hover:text-neutral-600 line-clamp-1">{p.name}</h4>
                <span className="text-[10px] font-black text-ink mt-0.5">Rp {p.current_price.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Size Advisor Modal */}
      <AnimatePresence>
        {isSizeModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeModalOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white border border-whisper p-8 z-50 flex flex-col gap-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-whisper pb-3">
                <span className="font-black text-xs uppercase tracking-widest text-ink">SIZE ADVISOR CALCULATOR</span>
                <button onClick={() => setIsSizeModalOpen(false)} className="text-ink hover:text-steel font-bold cursor-pointer">✕</button>
              </div>

              <p className="text-[11px] text-steel font-medium leading-relaxed uppercase tracking-wide">
                Bandingkan ukuran sepatu Anda yang biasa dari merk Nike atau Adidas untuk mendapatkan rekomendasi ukuran terbaik dari Safthoo.
              </p>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-steel">MERK SEPATU ANDA</label>
                  <select 
                    value={advisorBrand}
                    onChange={(e) => setAdvisorBrand(e.target.value)}
                    className="bg-surface border border-whisper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink outline-none focus:border-black"
                  >
                    <option value="nike">NIKE</option>
                    <option value="adidas">ADIDAS</option>
                    <option value="converse">CONVERSE</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-steel">UKURAN BIASA (EU)</label>
                  <select 
                    value={advisorSize}
                    onChange={(e) => setAdvisorSize(Number(e.target.value))}
                    className="bg-surface border border-whisper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink outline-none focus:border-black"
                  >
                    {[36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49].map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={calculateRecommendedSize}
                  className="bg-black text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-colors mt-2 cursor-pointer animate-pulse"
                >
                  HITUNG UKURAN REKOMENDASI
                </button>

                {recommendedSizeResult !== null && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 bg-surface border border-whisper p-4 text-center"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-steel block">REKOMENDASI UKURAN SAFTHOO</span>
                    <span className="text-xl font-black text-ink block mt-1">EU {recommendedSizeResult}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 block mt-1 font-sans">
                      {advisorBrand === 'nike' ? 'FIT: TRUE TO SIZE (PAS DI KAKI)' : 
                       advisorBrand === 'adidas' ? 'SAFTHOO RUNS SLIGHTLY LARGE (TURUN 0.5/1 SIZE)' : 
                       'SAFTHOO RUNS SLIGHTLY SMALL (NAIK 0.5/1 SIZE)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (product.sizes?.includes(recommendedSizeResult)) {
                          setSelectedSize(recommendedSizeResult);
                          toast.success(`Ukuran ${recommendedSizeResult} berhasil diterapkan!`);
                        } else {
                          toast.warning(`Ukuran ${recommendedSizeResult} tidak tersedia untuk produk ini.`);
                        }
                        setIsSizeModalOpen(false);
                      }}
                      className="mt-3 underline text-[9px] font-black uppercase tracking-widest text-black hover:text-steel block mx-auto cursor-pointer"
                    >
                      GUNAKAN UKURAN INI
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
