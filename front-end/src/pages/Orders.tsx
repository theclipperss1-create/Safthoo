import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, Clock, Receipt, CaretDown, CaretUp, Printer, Phone, Truck } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Order {
  id: string;
  total_amount: number;
  subtotal_amount?: number;
  shipping_cost?: number;
  shipping_method?: string;
  service_fee?: number;
  recipient_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  notes?: string;
  status: string;
  created_at: string;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<(Order & { paymentStatus?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded order state for inline details
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderItemsMap, setOrderItemsMap] = useState<{ [orderId: string]: any[] }>({});
  const [loadingItemsMap, setLoadingItemsMap] = useState<{ [orderId: string]: boolean }>({});

  // Active print order state
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [printItems, setPrintItems] = useState<any[]>([]);

  // Set up real-time listener for orders and their payment statuses
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const q = query(
      collection(db, 'orders'),
      where('user_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const orderData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        // Sort orders locally so we don't require composite indexing in Firestore
        orderData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Fetch payment status for each order
        const paymentPromises = orderData.map(async (order) => {
          const pq = query(collection(db, 'payments'), where('order_id', '==', order.id));
          const psnap = await getDocs(pq);
          if (!psnap.empty) {
            return { ...order, paymentStatus: psnap.docs[0].data().status };
          }
          return order;
        });

        const fullOrders = await Promise.all(paymentPromises);
        setOrders(fullOrders);
      } catch (error) {
        console.error("Gagal mengambil data pesanan secara real-time", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Handle accordion toggle & lazy load items
  const handleToggleExpand = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);

    if (!orderItemsMap[orderId]) {
      setLoadingItemsMap(prev => ({ ...prev, [orderId]: true }));
      try {
        const q = query(
          collection(db, 'order_items'),
          where('order_id', '==', orderId)
        );
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => doc.data());
        setOrderItemsMap(prev => ({ ...prev, [orderId]: items }));
      } catch (err) {
        console.error("Gagal mengambil rincian barang pesanan", err);
      } finally {
        setLoadingItemsMap(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  // Trigger browser print for a specific order
  const handlePrintOrder = (order: Order, items: any[]) => {
    setPrintOrder(order);
    setPrintItems(items);
    // Allow React state to flush to DOM before triggering printer dialog
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="min-h-[100dvh] bg-canvas text-ink pb-24 print:bg-white print:pb-0 print:text-black"
    >
      {/* Header (Hidden during print) */}
      <header className="sticky top-0 z-40 bg-white border-b border-whisper print:hidden">
        <div className="flex items-center gap-4 px-6 py-4 max-w-2xl mx-auto w-full">
          <Link to="/" className="p-2 -ml-2 text-steel hover:text-ink transition-colors">
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <h1 className="text-base font-black uppercase tracking-widest">RIWAYAT TRANSAKSI</h1>
        </div>
      </header>

      {/* Orders List Section (Hidden during print) */}
      <section className="max-w-2xl mx-auto p-6 flex flex-col gap-6 print:hidden">
        <div className="mb-4">
          <h2 className="text-xl font-black uppercase tracking-widest text-ink">Semua Pesanan</h2>
          <p className="text-[10px] text-steel mt-1 font-bold uppercase tracking-widest">Lacak status pembayaran, alamat pengiriman, dan cetak nota belanja Anda secara instan.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-surface animate-pulse border border-whisper"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-whisper bg-white p-8">
            <Package size={36} className="text-steel mb-4 opacity-40 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-widest mb-1">Belum Ada Transaksi</h3>
            <p className="text-steel text-[10px] mb-6 max-w-xs leading-relaxed uppercase font-bold tracking-wider">Anda belum melakukan pembelian apa pun.</p>
            <Link to="/" className="bg-black text-white px-6 py-3.5 font-bold text-xs uppercase tracking-widest hover:bg-neutral-900 transition-colors">
              Kembali ke Katalog
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order, idx) => {
              const isExpanded = expandedOrderId === order.id;
              const items = orderItemsMap[order.id] || [];
              const itemsLoading = loadingItemsMap[order.id] || false;
              
              // Safe fallbacks for older orders
              const recipientName = order.recipient_name || user?.displayName || 'PELANGGAN SAFTHOO';
              const phone = order.phone || '-';
              const address = order.address || 'ALAMAT TIDAK TERCATAT';
              const city = order.city || '';
              const postalCode = order.postal_code || '';
              const shippingMethod = order.shipping_method || 'Eco Courier';
              const shippingCost = order.shipping_cost ?? 0;
              const serviceFee = order.service_fee ?? 0;
              const subtotalAmount = order.subtotal_amount ?? (order.total_amount - shippingCost - serviceFee);

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
                  key={order.id} 
                  className="bg-white border border-whisper flex flex-col transition-all duration-300"
                >
                  {/* Card Header Accordion Trigger */}
                  <div 
                    onClick={() => handleToggleExpand(order.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-surface border border-whisper flex items-center justify-center text-steel shrink-0">
                        <Receipt size={18} weight="bold" />
                      </div>
                      
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] font-black text-steel uppercase tracking-widest">
                          ID: #{order.id.slice(0, 8)}
                        </span>
                        <span className="font-black text-base text-ink">
                          Rp {order.total_amount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-steel font-bold uppercase tracking-widest">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      {order.paymentStatus === 'paid' ? (
                        <span className="flex items-center gap-1.5 bg-surface text-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-whisper">
                          <CheckCircle weight="bold" size={13} />
                          Lunas
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 bg-surface text-amber-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-whisper border-amber-200">
                          <Clock weight="bold" size={13} />
                          Menunggu
                        </span>
                      )}
                      
                      <div className="text-steel">
                        {isExpanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-whisper bg-surface/50"
                      >
                        <div className="p-5 flex flex-col gap-6 text-[10px] font-bold uppercase tracking-wider text-black">
                          
                          {/* Shipping Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-whisper pb-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-steel font-black tracking-widest text-[9px]">Penerima & Alamat</span>
                              <span className="font-black text-xs text-black">{recipientName}</span>
                              <span className="text-steel leading-relaxed">{address}</span>
                              <span className="text-steel">{city} {postalCode}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 sm:text-right sm:items-end">
                              <span className="text-steel font-black tracking-widest text-[9px]">Kontak & Kurir</span>
                              <span className="text-black flex items-center gap-1"><Phone size={12} /> {phone}</span>
                              <span className="text-black flex items-center gap-1"><Truck size={12} /> {shippingMethod}</span>
                              {order.notes && <span className="text-steel text-[9px] italic font-medium mt-1">"Catatan: {order.notes}"</span>}
                            </div>
                          </div>

                          {/* Items Detail */}
                          <div className="flex flex-col gap-2.5">
                            <span className="text-steel font-black tracking-widest text-[9px]">Daftar Pembelian</span>
                            
                            {itemsLoading ? (
                              <div className="flex items-center gap-2 py-2">
                                <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
                                <span className="text-steel text-[9px] uppercase tracking-widest animate-pulse">Memuat barang...</span>
                              </div>
                            ) : items.length === 0 ? (
                              <span className="text-steel text-[9px] italic">Tidak ada rincian barang ditemukan</span>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {items.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs border-b border-whisper/40 pb-2 last:border-0 last:pb-0">
                                    <div className="flex flex-col">
                                      <span className="font-black text-black">{item.product_name}</span>
                                      <span className="text-[9px] text-steel font-black tracking-widest mt-0.5">
                                        {item.color && `WARNA: ${item.color}`}
                                        {item.color && item.size ? ' | ' : ''}
                                        {item.size ? `SIZE: ${item.size}` : ''}
                                        {` | QTY: ${item.quantity}`}
                                      </span>
                                    </div>
                                    <span className="font-black text-black">
                                      Rp {(item.unit_price * item.quantity).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Fees Summary */}
                          <div className="bg-white border border-whisper p-4 flex flex-col gap-2 border-t border-black pt-3">
                            <div className="flex justify-between text-steel">
                              <span>Subtotal</span>
                              <span className="text-black font-black">Rp {subtotalAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-steel">
                              <span>Ongkos Kirim</span>
                              <span className="text-black font-black">{shippingCost === 0 ? 'GRATIS' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span>
                            </div>
                            <div className="flex justify-between text-steel">
                              <span>Biaya Layanan</span>
                              <span className="text-black font-black">Rp {serviceFee.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="h-px bg-whisper my-1"></div>
                            <div className="flex justify-between text-xs font-black pt-0.5">
                              <span>Total Bayar</span>
                              <span className="text-sm text-black">Rp {order.total_amount.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          {/* Print Invoice Trigger */}
                          {order.paymentStatus === 'paid' && !itemsLoading && items.length > 0 && (
                            <button
                              onClick={() => handlePrintOrder(order, items)}
                              className="w-full bg-black text-white py-3.5 font-black uppercase tracking-widest text-[9px] hover:bg-neutral-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Printer size={14} weight="bold" /> Cetak Nota Belanja
                            </button>
                          )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================== ROOT LEVEL PRINT ONLY INVOICE ==================== */}
      {printOrder && (
        <div className="hidden print:block print:fixed print:top-0 print:left-0 print:w-full print:h-full print:bg-white print:z-50 print:p-8 print:text-black font-sans">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center border-b border-black pb-6 mb-6">
            <h1 className="text-2xl font-black tracking-[0.25em] uppercase">SAFTHOO STORE</h1>
            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">SaaS E-Commerce Premium Store | Jakarta, Indonesia</p>
            <div className="mt-4 border border-black px-4 py-1 text-[10px] font-black uppercase tracking-widest bg-black text-white">
              NOTA PEMBELIAN LUNAS
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest border-b border-gray-200 pb-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <span>NOMOR INVOICE:</span>
              <span className="font-black">INV/{new Date(printOrder.created_at).getFullYear()}{String(new Date(printOrder.created_at).getMonth() + 1).padStart(2, '0')}{String(new Date(printOrder.created_at).getDate()).padStart(2, '0')}/SFH/{printOrder.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-1.5 text-right">
              <span>TANGGAL TRANSAKSI:</span>
              <span className="font-black">
                {new Date(printOrder.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} | {new Date(printOrder.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Address Details */}
          <div className="grid grid-cols-2 gap-6 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200 pb-6 mb-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-gray-500 font-black tracking-widest text-[9px] border-b border-gray-200 pb-1 mb-1">DATA PENERIMA</span>
              <span className="font-black text-xs">{printOrder.recipient_name || user?.displayName || 'PELANGGAN SAFTHOO'}</span>
              <span>TELP: {printOrder.phone || '-'}</span>
              <span>EMAIL: {user?.email}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-gray-500 font-black tracking-widest text-[9px] border-b border-gray-200 pb-1 mb-1">ALAMAT PENGIRIMAN</span>
              <span className="leading-relaxed">{printOrder.address || 'ALAMAT TIDAK TERCATAT'}</span>
              <span>{printOrder.city || ''}, {printOrder.postal_code || ''}</span>
              <span className="font-black mt-1">KURIR: {printOrder.shipping_method || 'Eco Courier'}</span>
              {printOrder.notes && <span className="text-gray-500 text-[9px] italic mt-1 font-medium">CATATAN: "{printOrder.notes}"</span>}
            </div>
          </div>

          {/* Items Table */}
          <div className="flex flex-col gap-3 mb-6">
            <span className="text-gray-500 font-black tracking-widest text-[9px] border-b border-black pb-1 mb-1">RINCIAN BARANG</span>
            
            <div className="flex flex-col gap-3">
              {printItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-black uppercase tracking-wider">{item.product_name}</span>
                    <span className="text-[9px] text-gray-500 font-black tracking-widest mt-0.5">
                      {item.color && `WARNA: ${item.color}`}
                      {item.color && item.size ? ' | ' : ''}
                      {item.size ? `SIZE: ${item.size}` : ''}
                      {` | QTY: ${item.quantity}`}
                    </span>
                  </div>
                  <div className="font-black">
                    Rp {(item.unit_price * item.quantity).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Money Math */}
          <div className="bg-gray-50 border border-gray-200 p-5 flex flex-col gap-2.5 text-xs font-bold uppercase tracking-widest border-t border-black pt-4 mb-6">
            <div className="flex justify-between text-gray-500">
              <span>SUBTOTAL BELANJA</span>
              <span className="font-black text-black">Rp {(printOrder.subtotal_amount ?? (printOrder.total_amount - (printOrder.shipping_cost ?? 0) - (printOrder.service_fee ?? 0))).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>ONGKOS KIRIM</span>
              <span className="font-black text-black">
                {printOrder.shipping_cost === 0 ? 'GRATIS' : `Rp ${(printOrder.shipping_cost ?? 0).toLocaleString('id-ID')}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>BIAYA LAYANAN</span>
              <span className="font-black text-black">Rp {(printOrder.service_fee ?? 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="h-px bg-gray-200 my-1"></div>
            <div className="flex justify-between text-sm font-black pt-1">
              <span>TOTAL PEMBAYARAN</span>
              <span className="text-base">Rp {printOrder.total_amount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-[9px] text-gray-500 pt-2 border-t border-gray-200 font-bold">
              <span>METODE PEMBAYARAN:</span>
              <span className="font-black text-black">QRIS (SAFTHOO PAY)</span>
            </div>
          </div>

          {/* Footer Receipt Message */}
          <div className="flex flex-col items-center text-center border-t border-gray-200 pt-6 mt-4 gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[9px] font-black uppercase tracking-wider">TERIMA KASIH TELAH BERBELANJA DI SAFTHOO</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-xs">Pesanan Anda telah dikonfirmasi dan sedang dipersiapkan untuk diserahkan ke kurir pengiriman.</p>
            </div>

            {/* Simulated Barcode */}
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <div className="h-8 w-48 bg-black flex items-center justify-between p-1 opacity-85">
                {[...Array(24)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-white h-full" 
                    style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
                  />
                ))}
              </div>
              <span className="text-[7px] font-black tracking-[0.3em] text-gray-400">*{printOrder.id.toUpperCase()}*</span>
            </div>
          </div>

        </div>
      )}
    </motion.main>
  );
}
