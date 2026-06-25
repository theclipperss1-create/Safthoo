import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { subscribeProducts } from '../services/productService';
import type { Product } from '../services/productService';
import { MagnifyingGlass, ShoppingCart, Package, ArrowRight, Heart } from '@phosphor-icons/react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { goeyToast as toast } from 'goey-toast';
import { subscribeToWishlist, toggleWishlist } from '../services/checkoutService';

export default function Catalog() {
  const { user } = useAuth();
  const { addToCart, totalItems, setIsCartOpen, setIsWishlistOpen } = useCart();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Scroll Progress Bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Subscribe to wishlist
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


  // Subscribe to products in real-time
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeProducts((data) => {
      setProducts(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthAction = () => {
    if (user) {
      signOut(auth);
      toast.success('Logged out successfully');
    } else {
      navigate('/login');
    }
  };

  const handleAddToCartDirect = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stock_qty <= 0) return;
    addToCart(product, 1);
    toast.success(`${product.name} added to cart.`);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } }
  };

  // Find a product for the Hero section (e.g. shoe_01 or the first runner)
  const heroProduct = products.find(p => p.id === 'shoe_01') || products[0];

  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="w-full max-w-full overflow-x-hidden min-h-[100dvh] flex flex-col bg-canvas text-ink"
    >
      {/* Promo Marquee Strip */}
      <div className="w-full bg-black text-white text-[9px] font-black tracking-[0.2em] py-2.5 text-center uppercase border-b border-whisper overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          FREE SHIPPING NATIONWIDE • 30-DAY RETURN GUARANTEE • REAL-TIME STOCK SYNC • 
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 25s linear infinite;
            display: inline-block;
            padding-left: 100%;
          }
        `}</style>
      </div>

      {/* Stark Minimal Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3px] bg-black origin-left z-50 pointer-events-none" 
        style={{ scaleX }} 
      />

      {/* Stark Minimal Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-whisper">
        <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full">
          <span 
            className="font-black tracking-[0.25em] text-lg md:text-xl cursor-pointer uppercase select-none hover:opacity-85 transition-opacity" 
            onClick={() => navigate('/')}
          >
            Safthoo
          </span>
          
          <div className="flex items-center bg-surface border border-whisper px-3 py-1.5 flex-1 max-w-md mx-2 sm:mx-6 transition-all focus-within:border-black">
            <MagnifyingGlass className="text-steel" size={16} />
            <input 
              type="text" 
              placeholder="Search collection..." 
              className="bg-transparent border-none outline-none text-xs w-full ml-2 text-ink placeholder:text-steel uppercase tracking-wider font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={() => navigate('/orders')}
                className="relative p-2 text-steel hover:text-ink hover:scale-105 transition-all cursor-pointer"
                title="Order History"
              >
                <Package size={20} weight="bold" />
              </button>
            )}
            
            {/* Wishlist Button */}
            {user && (
              <button 
                onClick={() => setIsWishlistOpen(true)}
                className="relative p-2 text-steel hover:text-ink hover:scale-105 transition-all cursor-pointer"
                title="Wishlist"
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

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-steel hover:text-ink hover:scale-105 transition-all cursor-pointer"
              title="Shopping Cart"
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
            <button 
              onClick={handleAuthAction}
              className="border border-black bg-white text-black px-4 py-2 hover:bg-black hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest ml-2 cursor-pointer"
            >
              {user ? 'LOGOUT' : 'LOGIN'}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section (Nike/Adidas Interactive Style) */}
      {heroProduct && !searchQuery && activeCategory === 'all' && (
        <section className="w-full bg-[#F6F6F6] text-black py-24 px-6 relative overflow-hidden border-b border-whisper">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, #000000 1.2px, transparent 1.2px)',
            backgroundSize: '32px 32px'
          }}></div>
          
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
            {/* Left side text */}
            <motion.div 
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 90, damping: 22 }}
              className="flex flex-col gap-5 text-left"
            >
              <div className="inline-flex items-center gap-2 border border-black px-3 py-1.5 self-start text-[8px] font-black uppercase tracking-[0.18em] bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span>
                BEST SELLER OF THE MONTH
              </div>
              <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase text-black select-none">
                {heroProduct.name}
              </h2>
              <p className="text-steel text-xs md:text-sm font-bold leading-relaxed max-w-sm uppercase tracking-wider">
                Engineered with responsive cushioning and premium knit upper for uncompromising performance.
              </p>
              <div className="flex items-center gap-6 mt-4">
                <button 
                  onClick={() => navigate(`/product/${heroProduct.id}`)}
                  className="bg-black text-white px-9 py-4.5 font-black uppercase tracking-widest text-[10px] hover:bg-neutral-900 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-[1px]"
                >
                  SHOP NOW <ArrowRight size={14} weight="bold" />
                </button>
                <span className="text-base font-black tracking-wider text-black">
                  Rp {heroProduct.current_price.toLocaleString('id-ID')}
                </span>
              </div>
            </motion.div>
            
            {/* Right side shoe photo (Interactive Parallax style) */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 70, damping: 22, delay: 0.08 }}
              className="relative aspect-[4/3] md:aspect-square overflow-hidden group cursor-pointer bg-white border border-whisper shadow-sm"
              onClick={() => navigate(`/product/${heroProduct.id}`)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors z-10"></div>
              <img 
                src={heroProduct.image_url} 
                alt={heroProduct.name}
                className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-[1200ms] ease-out"
              />
              <div className="absolute bottom-4 left-4 text-[8px] font-black uppercase tracking-widest bg-white text-black px-4 py-2 border border-whisper shadow-md z-20">
                CLICK FOR DETAILS
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Curated Collections Spotlight Bento */}
      {!searchQuery && activeCategory === 'all' && (
        <section className="py-16 px-6 max-w-7xl w-full mx-auto">
          <div className="mb-8 text-left">
            <span className="text-[9px] font-black tracking-widest text-steel uppercase">COLLECTION SPOTLIGHT</span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-ink mt-1">FEATURED CATEGORIES</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1: Sneakers */}
            <div 
              onClick={() => setActiveCategory('sneaker')}
              className="relative aspect-square md:aspect-[4/5] overflow-hidden group cursor-pointer border border-whisper bg-surface"
            >
              <img 
                src="https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80" 
                alt="Sneakers" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-colors"></div>
              <div className="absolute bottom-6 left-6 text-left">
                <span className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase tracking-widest border border-whisper shadow-sm">
                  CLASSIC SNEAKERS
                </span>
              </div>
            </div>

            {/* Box 2: Runners */}
            <div 
              onClick={() => setActiveCategory('runner')}
              className="relative aspect-square md:aspect-[4/5] overflow-hidden group cursor-pointer border border-whisper bg-surface"
            >
              <img 
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80" 
                alt="Runners" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-colors"></div>
              <div className="absolute bottom-6 left-6 text-left">
                <span className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase tracking-widest border border-whisper shadow-sm">
                  PERFORMANCE RUNNERS
                </span>
              </div>
            </div>

            {/* Box 3: Boots */}
            <div 
              onClick={() => setActiveCategory('boot')}
              className="relative aspect-square md:aspect-[4/5] overflow-hidden group cursor-pointer border border-whisper bg-surface"
            >
              <img 
                src="https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=800&q=80" 
                alt="Boots" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-colors"></div>
              <div className="absolute bottom-6 left-6 text-left">
                <span className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase tracking-widest border border-whisper shadow-sm">
                  TRAIL &amp; OUTDOOR BOOTS
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Campaign Banner: The New Movement */}
      {!searchQuery && activeCategory === 'all' && (
        <section className="w-full bg-[#FFFFFF] border-t border-b border-whisper py-20 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
            {/* Image Left */}
            <div className="w-full md:w-1/2 aspect-[16/10] overflow-hidden border border-whisper bg-surface">
              <img 
                src="https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80" 
                alt="Campaign Canvas" 
                className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-[1500ms]"
              />
            </div>
            
            {/* Text Right */}
            <div className="w-full md:w-1/2 flex flex-col gap-4 text-left">
              <span className="text-[9px] font-black tracking-widest text-steel uppercase">NEW CAMPAIGN</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-ink">
                THE NEW STREET MOVEMENT
              </h2>
              <p className="text-steel text-xs md:text-sm font-medium leading-relaxed max-w-md uppercase tracking-wider">
                Celebrate the freedom of urban expression. Designed with a classic silhouette powered by futuristic, durable materials.
              </p>
              <button 
                onClick={() => {
                  const el = document.getElementById('catalog-view');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-ink hover:text-steel underline self-start cursor-pointer mt-2"
              >
                Explore Street Collection
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Catalog View */}
      <section id="catalog-view" className="py-12 sm:py-16 px-4 sm:px-6 max-w-7xl w-full mx-auto flex-1">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-none text-ink">
              Collection Catalog
            </h1>
            <p className="text-steel text-[10px] font-bold uppercase tracking-widest mt-2">
              Engineered for modern urban comfort
            </p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-steel">
            SHOWING {filteredProducts.length} PRODUCTS
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto pb-4 mb-8 sm:mb-12 -mx-4 sm:-mx-6 px-4 sm:px-6 scrollbar-none border-b border-whisper/40">
          {[
            { id: 'all', label: 'ALL' },
            { id: 'sneaker', label: 'SNEAKERS' },
            { id: 'runner', label: 'RUNNERS' },
            { id: 'loafer', label: 'LOAFERS' },
            { id: 'boot', label: 'BOOTS' },
            { id: 'accessories', label: 'ACCESSORIES' }
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                }}
                className="relative pb-2 text-[10px] font-black uppercase tracking-widest outline-none transition-colors shrink-0 cursor-pointer text-steel hover:text-ink select-none"
              >
                <span className={isActive ? 'text-black' : ''}>{cat.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryBorder"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-surface animate-pulse border border-whisper/50"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border border-whisper border-dashed bg-white">
            <Package size={48} className="text-steel mb-4 opacity-40 animate-pulse" />
            <p className="text-steel font-bold text-xs uppercase tracking-widest">No products found</p>
            {(searchQuery || activeCategory !== 'all') && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }} 
                className="mt-4 border border-black px-5 py-2.5 hover:bg-black hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-8 sm:gap-y-10"
          >
            {filteredProducts.map((product) => {
              return (
                <motion.div 
                  key={product.id} 
                  variants={itemVariants}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group relative flex flex-col bg-white transition-colors cursor-pointer text-left"
                >
                  <div className="flex flex-col h-full justify-between">
                    {/* Image Box */}
                    <div className="relative overflow-hidden bg-surface border border-whisper/30 aspect-square mb-3">
                      <img 
                        src={product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'} 
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />

                      {/* Wishlist Heart Toggle */}
                      {user && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const added = await toggleWishlist(user.uid, product.id);
                              if (added) {
                                toast.success(`${product.name} saved to wishlist`);
                              } else {
                                toast.success(`${product.name} removed from wishlist`);
                              }
                            } catch (err) {
                              console.error("Gagal mengubah wishlist", err);
                            }
                          }}
                          className="absolute top-2 right-2 z-20 bg-white/80 hover:bg-white border border-whisper/50 p-1.5 hover:scale-105 transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer"
                        >
                          <Heart 
                            size={14} 
                            weight={wishlistIds.includes(product.id) ? 'fill' : 'bold'} 
                            className={wishlistIds.includes(product.id) ? 'text-black' : 'text-steel'} 
                          />
                        </button>
                      )}
                      {product.stock_qty <= 0 ? (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-black text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest">SOLD OUT</span>
                        </div>
                      ) : product.stock_qty < 5 ? (
                        <div className="absolute top-2 left-2 bg-black text-white px-2.5 py-1 text-[9px] font-black tracking-widest uppercase">
                          ONLY {product.stock_qty} LEFT
                        </div>
                      ) : null}
                      
                      {/* Interactive slide-up Quick Add panel on image hover */}
                      {product.stock_qty > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/90 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out p-3 flex items-center justify-between">
                          <span className="text-[9px] font-black text-white uppercase tracking-widest">
                            SIZES AVAILABLE: {product.sizes ? `${product.sizes[0]}-${product.sizes[product.sizes.length-1]}` : ''}
                          </span>
                          <button 
                            onClick={(e) => handleAddToCartDirect(e, product)}
                            className="bg-white text-black hover:bg-neutral-200 transition-colors text-[9px] font-black uppercase tracking-widest px-3 py-2 cursor-pointer"
                          >
                            + ADD TO CART
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Meta details */}
                    <div className="flex flex-col gap-0.5">
                      {/* Product category & Color count */}
                      <div className="flex justify-between items-center text-[9px] font-black text-steel tracking-widest uppercase">
                        <span>{product.category}</span>
                        {product.colors && product.colors.length > 0 && (
                          <span>{product.colors.length} COLORS</span>
                        )}
                      </div>
                      
                      {/* Product Name */}
                      <h3 className="font-bold text-ink text-xs uppercase tracking-wide group-hover:text-neutral-600 transition-colors mt-0.5 leading-tight">
                        {product.name}
                      </h3>
                      
                      {/* Price */}
                      <span className="font-semibold text-xs text-ink mt-0.5">
                        Rp {product.current_price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* Membership Campaign Banner */}
      {!searchQuery && activeCategory === 'all' && (
        <section className="w-full bg-[#FAFAFA] border-t border-whisper py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
            <span className="text-[9px] font-black tracking-widest text-steel uppercase border border-whisper px-3 py-1 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
              SAFTHOO CLUB
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink mt-2">
              JOIN THE SAFTHOO MEMBERSHIP
            </h2>
            <p className="text-steel text-[10px] font-bold uppercase tracking-wider leading-relaxed max-w-md">
              Get 15% off your first order, exclusive release access, and free shipping with no minimum spend.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="mt-4 bg-black text-white px-8 py-4 text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-colors cursor-pointer shadow-md"
            >
              JOIN NOW FOR FREE
            </button>
          </div>
        </section>
      )}
    </motion.main>
  );
}
