import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  checkoutCart, 
  simulatePaymentSuccess, 
  subscribeToPayment, 
  saveUserAddress, 
  getUserAddresses,
  type ShippingDetails, 
  type SavedAddress 
} from '../services/checkoutService';
import { QrCode, CheckCircle, WarningCircle, ArrowLeft, Receipt, Printer, Truck, MapPin, Notebook } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Shipping Form States
  const [recipientName, setRecipientName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'Eco' | 'Priority'>('Eco');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Address Book States
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [saveAddressChecked, setSaveAddressChecked] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');

  // Promo Code States
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);

  // Payment & Transaction States
  const [paymentData, setPaymentData] = useState<any>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Lock the checkout details in state before the cart is cleared
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [savedSubtotal, setSavedSubtotal] = useState(0);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [savedShipping, setSavedShipping] = useState<ShippingDetails | null>(null);
  const [savedNotes, setSavedNotes] = useState('');

  // Calculate costs based on shipping method
  const shippingCost = shippingMethod === 'Priority' ? 20000 : 0;
  const serviceFee = 1000;
  const grandTotal = Math.max(0, subtotal + shippingCost + serviceFee - discountAmount);

  // Load saved addresses on mount
  useEffect(() => {
    if (user) {
      getUserAddresses(user.uid)
        .then(addresses => {
          setSavedAddresses(addresses);
        })
        .catch(err => console.error("Gagal mengambil alamat", err));
    }
  }, [user]);

  // Adjust discounts dynamically if shipping method changes
  useEffect(() => {
    if (appliedPromo === 'FREEPRIORITY') {
      if (shippingMethod === 'Priority') {
        setDiscountAmount(20000);
      } else {
        // If switched to Eco, reset the voucher
        setAppliedPromo('');
        setPromoInput('');
        setDiscountAmount(0);
        setPromoMessage('Voucher gratis ongkir Priority Express dilepas karena metode pengiriman berubah.');
        setPromoSuccess(false);
      }
    }
  }, [shippingMethod, appliedPromo]);

  // Redirect if cart is empty and no checkout is in progress
  useEffect(() => {
    if (items.length === 0 && !paymentData && checkoutAmount === 0) {
      navigate('/cart');
    }
  }, [items, paymentData, checkoutAmount, navigate]);

  // Handle Apply Promo Code
  const handleApplyPromo = () => {
    setPromoMessage('');
    setPromoSuccess(false);
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setPromoMessage('Masukkan kode voucher.');
      return;
    }

    if (code === 'SAFTHOO10') {
      const discount = Math.round(subtotal * 0.1);
      setDiscountAmount(discount);
      setAppliedPromo(code);
      setPromoSuccess(true);
      setPromoMessage(`Kupon berhasil! Diskon 10% (-Rp ${discount.toLocaleString('id-ID')})`);
    } else if (code === 'FREEPRIORITY') {
      if (shippingMethod === 'Priority') {
        setDiscountAmount(20000);
        setAppliedPromo(code);
        setPromoSuccess(true);
        setPromoMessage('Kupon berhasil! Gratis ongkir Priority Express (-Rp 20.000)');
      } else {
        setPromoMessage('Kupon hanya berlaku untuk kurir Priority Express.');
      }
    } else if (code === 'STREETMOVEMENT') {
      if (subtotal >= 500000) {
        setDiscountAmount(50000);
        setAppliedPromo(code);
        setPromoSuccess(true);
        setPromoMessage('Kupon berhasil! Diskon kampanye Street Movement (-Rp 50.000)');
      } else {
        setPromoMessage('Minimal pembelian Rp 500.000 untuk kupon ini.');
      }
    } else {
      setPromoMessage('Kode promo tidak valid.');
    }
  };

  // Handle Form Submission and Trigger Checkout
  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setError('');

    // Form Validation
    if (!recipientName.trim() || !phone.trim() || !address.trim() || !city.trim() || !postalCode.trim()) {
      setFormError('Semua kolom bertanda bintang (*) wajib diisi.');
      return;
    }

    if (saveAddressChecked && !addressLabel.trim()) {
      setFormError('Label alamat wajib diisi jika Anda ingin menyimpan alamat ini.');
      return;
    }

    setIsProcessing(true);

    const shippingDetails: ShippingDetails = {
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      shippingMethod: shippingMethod === 'Priority' ? 'Safthoo Priority Express' : 'Safthoo Eco Courier',
      shippingCost: shippingCost,
    };

    try {
      // Save address if checked
      if (saveAddressChecked && user) {
        const savedAddr: SavedAddress = {
          label: addressLabel.trim().toUpperCase(),
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim()
        };
        await saveUserAddress(user.uid, savedAddr);
      }

      // Save details to local state before clearing cart
      setCheckoutAmount(grandTotal);
      setSavedSubtotal(subtotal);
      setPurchasedItems([...items]);
      setSavedShipping(shippingDetails);
      setSavedNotes(notes.trim());

      const { orderId, paymentId } = await checkoutCart(
        user!.uid, 
        items, 
        subtotal, 
        shippingDetails, 
        notes.trim(),
        appliedPromo,
        discountAmount
      );

      setOrderId(orderId);
      clearCart(); // Hard delete cart from local state
      setStep('payment');
      
      // Listen to realtime payment status
      subscribeToPayment(paymentId, (data) => {
        setPaymentData({ id: paymentId, ...data });
      });

    } catch (err: any) {
      setError(err.message || 'Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-canvas text-ink text-center">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-lg font-black uppercase tracking-widest mb-2">Checkout Gagal</h2>
        <p className="text-steel text-xs font-medium mb-6 max-w-sm leading-relaxed">{error}</p>
        <Link to="/cart" className="bg-black text-white px-6 py-3.5 font-bold text-xs uppercase tracking-widest hover:bg-neutral-900 transition-colors">
          Kembali ke Keranjang
        </Link>
      </div>
    );
  }

  if (isProcessing && step === 'shipping') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-canvas text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
          <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Memproses pesanan Anda...</p>
        </div>
      </div>
    );
  }

  const isPaid = paymentData?.status === 'paid';

  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="min-h-[100dvh] bg-canvas text-ink flex flex-col items-center p-6 pt-12 pb-24 w-full"
    >
      <div className="w-full max-w-5xl flex flex-col items-center print:p-0">
        
        {/* Step 1: Shipping Details Form */}
        {step === 'shipping' && (
          <div className="w-full flex flex-col">
            {/* Header Back Button */}
            <div className="mb-6 flex items-center">
              <Link to="/cart" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-steel hover:text-ink transition-colors">
                <ArrowLeft size={14} weight="bold" /> Kembali ke Keranjang
              </Link>
            </div>

            <h1 className="text-2xl font-black uppercase tracking-widest mb-8 border-b border-whisper pb-4">Checkout</h1>

            <form onSubmit={handleProcessOrder} className="w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Section */}
                <div className="lg:col-span-7 bg-white border border-whisper p-6 sm:p-8 flex flex-col gap-6">
                <div className="flex items-center gap-2 border-b border-whisper pb-3 text-xs font-black uppercase tracking-widest text-black">
                  <MapPin size={16} weight="bold" /> Informasi Pengiriman
                </div>

                {formError && (
                  <div className="text-[10px] bg-red-50 text-red-700 p-3 font-bold uppercase tracking-wider border border-red-200">
                    {formError}
                  </div>
                )}

                {/* Saved Address Book Selector */}
                {savedAddresses.length > 0 && (
                  <div className="flex flex-col gap-2 border-b border-whisper pb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-steel">Gunakan Alamat Tersimpan:</span>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setRecipientName(addr.recipientName);
                            setPhone(addr.phone);
                            setAddress(addr.address);
                            setCity(addr.city);
                            setPostalCode(addr.postalCode);
                          }}
                          className="px-3 py-2 border border-whisper text-[9px] font-black uppercase tracking-widest hover:border-black hover:bg-surface transition-all cursor-pointer rounded-none"
                        >
                          [{addr.label.toUpperCase()}]
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-steel">Nama Penerima *</label>
                    <input 
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="NAMA LENGKAP"
                      className="w-full bg-white border border-whisper px-4 py-3 text-xs uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-steel">Nomor Telepon *</label>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="CONTOH: 08123456789"
                      className="w-full bg-white border border-whisper px-4 py-3 text-xs uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-steel">Alamat Lengkap *</label>
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="NAMA JALAN, NOMOR RUMAH, KECAMATAN, KELURAHAN"
                    rows={3}
                    className="w-full bg-white border border-whisper px-4 py-3 text-xs uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-steel">Kota *</label>
                    <input 
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="KOTA / KABUPATEN"
                      className="w-full bg-white border border-whisper px-4 py-3 text-xs uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-steel">Kode Pos *</label>
                    <input 
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="KODE POS"
                      className="w-full bg-white border border-whisper px-4 py-3 text-xs uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-steel flex items-center gap-1">
                    <Truck size={14} weight="bold" /> Metode Pengiriman
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Eco Courier Option */}
                    <div 
                      onClick={() => setShippingMethod('Eco')}
                      className={`border p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all ${
                        shippingMethod === 'Eco' ? 'border-black bg-surface' : 'border-whisper hover:border-black/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-wider">Eco Courier</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">GRATIS</span>
                      </div>
                      <span className="text-[9px] text-steel font-bold uppercase tracking-wider">Estimasi Pengiriman: 3-5 Hari Kerja</span>
                    </div>

                    {/* Priority Express Option */}
                    <div 
                      onClick={() => setShippingMethod('Priority')}
                      className={`border p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all ${
                        shippingMethod === 'Priority' ? 'border-black bg-surface' : 'border-whisper hover:border-black/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-wider">Priority Express</span>
                        <span className="text-[10px] font-black text-black">Rp 20.000</span>
                      </div>
                      <span className="text-[9px] text-steel font-bold uppercase tracking-wider">Estimasi Pengiriman: 1-2 Hari Kerja</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-steel flex items-center gap-1">
                    <Notebook size={14} weight="bold" /> Catatan Pengiriman (Opsional)
                  </label>
                  <input 
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="TITIP DI POS SATPAM / NOMOR RUMAH PAGAR HITAM"
                    className="w-full bg-white border border-whisper px-4 py-3 text-xs uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold"
                  />
                </div>

                {/* Save Address Option */}
                <div className="flex flex-col gap-3 mt-2 border-t border-whisper pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={saveAddressChecked}
                      onChange={(e) => setSaveAddressChecked(e.target.checked)}
                      className="w-4 h-4 accent-black border-whisper cursor-pointer"
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-steel">
                      Simpan alamat ini untuk pembelian berikutnya
                    </span>
                  </label>
                  
                  {saveAddressChecked && (
                    <div className="flex flex-col gap-1.5 pl-6">
                      <label className="text-[8px] font-black uppercase tracking-widest text-steel">Label Alamat (Misal: Rumah, Kantor) *</label>
                      <input 
                        type="text"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        placeholder="MISAL: RUMAH / KANTOR"
                        className="w-full max-w-xs bg-white border border-whisper px-3 py-2 text-[10px] uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none font-bold"
                        required={saveAddressChecked}
                      />
                    </div>
                  )}
                </div>

                </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-5 bg-white border border-whisper p-6 sm:p-8 flex flex-col gap-6 lg:sticky lg:top-24">
                <div className="flex items-center gap-2 border-b border-whisper pb-3 text-xs font-black uppercase tracking-widest text-black">
                  <Receipt size={16} weight="bold" /> Ringkasan Keranjang
                </div>

                <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-xs border-b border-whisper/40 pb-3 last:border-0 last:pb-0">
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover border border-whisper" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-black text-black uppercase tracking-wider truncate">{item.name}</h4>
                          <span className="font-black text-black">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-steel font-black uppercase tracking-widest">
                          <span>
                            {item.selectedColor && `WARNA: ${item.selectedColor}`}
                            {item.selectedColor && item.selectedSize ? ' | ' : ''}
                            {item.selectedSize ? `SIZE: ${item.selectedSize}` : ''}
                          </span>
                          <span>x{item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo Code Input Box */}
                <div className="border-t border-whisper pt-4 flex flex-col gap-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-steel">KODE VOUCHER / PROMO</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="KODE PROMO"
                      disabled={appliedPromo !== ''}
                      className="flex-1 bg-white border border-whisper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-black transition-colors rounded-none disabled:opacity-50 font-mono"
                    />
                    {appliedPromo ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo('');
                          setPromoInput('');
                          setDiscountAmount(0);
                          setPromoMessage('');
                          setPromoSuccess(false);
                        }}
                        className="bg-black text-white px-4 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-colors cursor-pointer"
                      >
                        Hapus
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="bg-black text-white px-4 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-colors cursor-pointer"
                      >
                        Gunakan
                      </button>
                    )}
                  </div>
                  {promoMessage && (
                    <span className={`text-[8px] font-black uppercase tracking-widest leading-normal ${promoSuccess ? 'text-emerald-700' : 'text-red-700'}`}>
                      {promoMessage}
                    </span>
                  )}
                </div>

                <div className="border-t border-whisper pt-4 flex flex-col gap-2 text-xs font-bold uppercase tracking-widest">
                  <div className="flex justify-between items-center text-steel">
                    <span>Subtotal</span>
                    <span className="text-black">Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-steel">
                    <span>Ongkos Kirim ({shippingMethod === 'Priority' ? 'Priority' : 'Eco'})</span>
                    <span className="text-black">{shippingCost === 0 ? 'GRATIS' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span>
                  </div>
                  <div className="flex justify-between items-center text-steel">
                    <span>Biaya Layanan</span>
                    <span className="text-black">Rp {serviceFee.toLocaleString('id-ID')}</span>
                  </div>
                  
                  {/* Promo Code Deduction Row */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span>Potongan Promo ({appliedPromo})</span>
                      <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="h-px bg-whisper my-2"></div>
                  <div className="flex justify-between items-center text-sm font-black">
                    <span className="text-black">Total Pembayaran</span>
                    <span className="text-black">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-black text-white py-4.5 font-black uppercase tracking-widest text-xs hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  Proses Pesanan & Bayar
                </button>
              </div>
            </div>
          </form>
          </div>
        )}

        {/* Step 2: Payment (QRIS & Struk) */}
        {step === 'payment' && paymentData && (
          <div className="w-full flex flex-col items-center">
            
            {isPaid ? (
              /* ==================== PREMIUM PRINTABLE RECEIPT / INVOICE ==================== */
              <div className="w-full flex flex-col items-center">
                
                {/* Back Link & Print Action (hidden during print) */}
                <div className="w-full max-w-xl mb-6 flex justify-between items-center print:hidden">
                  <Link to="/orders" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-steel hover:text-ink transition-colors">
                    <ArrowLeft size={14} weight="bold" /> Riwayat Pesanan
                  </Link>
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-all cursor-pointer"
                  >
                    <Printer size={14} weight="bold" /> Cetak Nota
                  </button>
                </div>

                {/* Physical-style Editorial Invoice Box */}
                <div className="w-full max-w-xl bg-white border border-whisper p-8 sm:p-12 flex flex-col text-left print:border-0 print:p-0 print:w-full">
                  
                  {/* Store Brand Header */}
                  <div className="flex flex-col items-center text-center border-b border-black pb-6 mb-6">
                    <h1 className="text-2xl font-black tracking-[0.25em] uppercase text-black">SAFTHOO STORE</h1>
                    <p className="text-[8px] text-steel font-black uppercase tracking-widest mt-1">SaaS E-Commerce Premium Store | Jakarta, Indonesia</p>
                    <div className="mt-4 border border-black px-4 py-1 text-[10px] font-black uppercase tracking-widest bg-black text-white">
                      NOTA PEMBELIAN LUNAS
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest text-black border-b border-whisper pb-4 mb-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-steel">NOMOR INVOICE:</span>
                      <span className="font-black text-black">INV/{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}/SFH/{orderId?.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-right">
                      <span className="text-steel">TANGGAL TRANSAKSI:</span>
                      <span className="font-black text-black">
                        {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} | {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Shipping Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10px] font-bold uppercase tracking-wider border-b border-whisper pb-6 mb-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-steel font-black tracking-widest text-[9px] border-b border-whisper pb-1 mb-1">DATA PENERIMA</span>
                      <span className="font-black text-black text-xs">{savedShipping?.recipientName}</span>
                      <span className="text-steel">TELP: {savedShipping?.phone}</span>
                      <span className="text-steel">EMAIL: {user?.email}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-steel font-black tracking-widest text-[9px] border-b border-whisper pb-1 mb-1">ALAMAT PENGIRIMAN</span>
                      <span className="text-black leading-relaxed">{savedShipping?.address}</span>
                      <span className="text-black">{savedShipping?.city}, {savedShipping?.postalCode}</span>
                      <span className="font-black text-black mt-1">KURIR: {savedShipping?.shippingMethod}</span>
                      {savedNotes && <span className="text-steel text-[9px] italic mt-1 font-medium">CATATAN: "{savedNotes}"</span>}
                    </div>
                  </div>

                  {/* Table of Items */}
                  <div className="flex flex-col gap-3 mb-6">
                    <span className="text-steel font-black tracking-widest text-[9px] border-b border-black pb-1 mb-1">RINCIAN BARANG</span>
                    
                    <div className="flex flex-col gap-3">
                      {purchasedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-whisper/40 pb-2 last:border-0 last:pb-0">
                          <div className="flex flex-col min-w-0">
                            <span className="text-black font-black uppercase tracking-wider truncate max-w-[280px]">
                              {item.name}
                            </span>
                            <span className="text-[9px] text-steel font-black uppercase tracking-widest mt-0.5">
                              {item.selectedColor && `WARNA: ${item.selectedColor}`}
                              {item.selectedColor && item.selectedSize ? ' | ' : ''}
                              {item.selectedSize ? `SIZE: ${item.selectedSize}` : ''}
                              {` | QTY: ${item.quantity}`}
                            </span>
                          </div>
                          <div className="text-right font-black text-black shrink-0 ml-4">
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-surface border border-whisper p-5 flex flex-col gap-2.5 text-xs font-bold uppercase tracking-widest border-t border-black pt-4 mb-6">
                    <div className="flex justify-between text-steel">
                      <span>SUBTOTAL BELANJA</span>
                      <span className="text-black font-black">Rp {savedSubtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-steel">
                      <span>ONGKOS KIRIM</span>
                      <span className="text-black font-black">
                        {savedShipping?.shippingCost === 0 ? 'GRATIS' : `Rp ${savedShipping?.shippingCost.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-steel">
                      <span>BIAYA LAYANAN</span>
                      <span className="text-black font-black">Rp {serviceFee.toLocaleString('id-ID')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>POTONGAN PROMO ({appliedPromo})</span>
                        <span className="font-black">-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="h-px bg-whisper my-1"></div>
                    <div className="flex justify-between text-sm font-black pt-1">
                      <span className="text-black">TOTAL PEMBAYARAN</span>
                      <span className="text-black text-base">Rp {checkoutAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-steel/80 pt-2 border-t border-whisper/50 font-bold">
                      <span>METODE PEMBAYARAN:</span>
                      <span className="text-black font-black">QRIS (SAFTHOO PAY)</span>
                    </div>
                  </div>

                  {/* Footer Terms / Message */}
                  <div className="flex flex-col items-center text-center border-t border-whisper pt-6 mt-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-black">TERIMA KASIH TELAH BERBELANJA DI SAFTHOO</p>
                      <p className="text-[8px] text-steel font-bold uppercase tracking-widest leading-relaxed max-w-xs">Pesanan Anda telah dikonfirmasi dan sedang dipersiapkan untuk diserahkan ke kurir pengiriman.</p>
                    </div>

                    {/* Simulated Barcode */}
                    <div className="flex flex-col items-center gap-1.5 mt-2">
                      <div className="h-8 w-48 bg-black flex items-center justify-between p-1 opacity-80">
                        {[...Array(24)].map((_, i) => (
                          <div 
                            key={i} 
                            className="bg-white h-full" 
                            style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-[7px] font-black tracking-[0.3em] uppercase text-steel">*{orderId?.toUpperCase()}*</span>
                    </div>
                  </div>

                </div>

                {/* Final Actions */}
                <div className="w-full max-w-xl mt-6 flex flex-col gap-3 print:hidden">
                  <Link to="/orders" className="w-full bg-black text-white py-4.5 font-black uppercase tracking-widest text-xs hover:bg-neutral-900 transition-colors flex items-center justify-center">
                    Lihat Semua Pesanan Anda
                  </Link>
                  <Link to="/" className="w-full bg-white border border-whisper text-black py-4 font-black uppercase tracking-widest text-xs hover:bg-surface transition-colors flex items-center justify-center">
                    Kembali Belanja
                  </Link>
                </div>
              </div>
            ) : (
              /* ==================== QRIS SCANNING STEP ==================== */
              <div className="w-full max-w-md bg-white border border-whisper p-8 flex flex-col items-center text-center">
                <h1 className="text-lg font-black uppercase tracking-widest mb-2">Selesaikan Pembayaran</h1>
                <p className="text-steel text-[10px] font-bold uppercase tracking-wider mb-6">Scan QRIS di bawah dengan m-Banking atau e-Wallet Anda.</p>
                
                {/* Minimalist QRIS Box */}
                <div className="w-48 h-48 bg-white border border-whisper flex flex-col items-center justify-center text-steel mb-6 p-4">
                  <QrCode size={96} weight="bold" className="text-black" />
                  <span className="text-[9px] font-black mt-3 tracking-widest uppercase text-steel">QRIS SIMULASI</span>
                </div>

                {/* Recipient summary for confirmation */}
                <div className="w-full border-t border-b border-whisper/80 py-4 mb-6 flex flex-col gap-2 text-left text-[9px] font-bold uppercase tracking-wider">
                  <span className="text-steel font-black tracking-widest border-b border-whisper/50 pb-1 mb-1">PENGIRIMAN KEPADA:</span>
                  <div className="flex justify-between">
                    <span className="text-black font-black">{savedShipping?.recipientName}</span>
                    <span className="text-steel">{savedShipping?.phone}</span>
                  </div>
                  <span className="text-black leading-relaxed truncate">{savedShipping?.address}, {savedShipping?.city}</span>
                </div>

                <div className="w-full bg-surface border border-whisper p-4 mb-6 flex justify-between items-center text-xs font-black uppercase tracking-widest">
                  <span className="text-steel">Total Tagihan</span>
                  <span className="text-sm text-black">Rp {checkoutAmount.toLocaleString('id-ID')}</span>
                </div>

                <button 
                  onClick={() => simulatePaymentSuccess(paymentData.id, orderId!)}
                  className="w-full bg-black text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle weight="bold" size={16} /> Simulasikan Bayar Sukses
                </button>
                <p className="text-[8px] text-steel font-bold uppercase tracking-widest mt-4">Status diperbarui secara real-time via Firestore</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.main>
  );
}
