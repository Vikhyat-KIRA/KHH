import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Truck,
  Zap,
  ShoppingBag,
  TicketPercent,
  Plus,
  Trash2
} from 'lucide-react';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

export default function RetailForm() {
  const { language, t } = useLanguage();

  // Input fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // Dynamic structured medicine rows
  const [medicineItems, setMedicineItems] = useState([
    { name: '', potency: '30C', customPotency: '', bottleSize: '30ml', customBottleSize: '', quantity: 1 }
  ]);

  // AI Estimation States
  const [estimating, setEstimating] = useState(false);
  const [estimatedData, setEstimatedData] = useState(null);
  const [estimateError, setEstimateError] = useState('');

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [orderDetails, setOrderDetails] = useState(null);

  // Dynamic row modifiers
  const addMedicineRow = () => {
    setMedicineItems([
      ...medicineItems,
      { name: '', potency: '30C', customPotency: '', bottleSize: '30ml', customBottleSize: '', quantity: 1 }
    ]);
  };

  const removeMedicineRow = (index) => {
    if (medicineItems.length > 1) {
      setMedicineItems(medicineItems.filter((_, idx) => idx !== index));
    }
  };

  const updateMedicineRow = (index, field, value) => {
    const updated = [...medicineItems];
    updated[index][field] = value;
    setMedicineItems(updated);
    if (estimatedData) setEstimatedData(null);
  };

  const incrementQty = (index) => {
    const updated = [...medicineItems];
    updated[index].quantity += 1;
    setMedicineItems(updated);
    if (estimatedData) setEstimatedData(null);
  };

  const decrementQty = (index) => {
    const updated = [...medicineItems];
    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1;
      setMedicineItems(updated);
      if (estimatedData) setEstimatedData(null);
    }
  };

  const calculateLocalDeliveryCharge = (addressStr, subtotal) => {
    if (subtotal >= 500) return 0;
    if (!addressStr || !addressStr.trim()) return 50;

    const addr = addressStr.toLowerCase();
    
    // Tier 1: Very Close (~ under 3km) -> ₹30
    if (
      addr.includes('upper bazar') || 
      addr.includes('lalpur') || 
      addr.includes('circular road') || 
      addr.includes('albert ekka') || 
      addr.includes('main road') || 
      addr.includes('hindpiri') ||
      addr.includes('daily market') ||
      addr.includes('kotwali') ||
      addr.includes('purulia road') ||
      addr.includes('dr. fatehullah')
    ) {
      return 30;
    }

    // Tier 3: Medium-Far (~ 8km - 15km) -> ₹75
    if (
      addr.includes('doranda') || 
      addr.includes('hinoo') || 
      addr.includes('birsa nagar') || 
      addr.includes('jagannathpur') || 
      addr.includes('hatia') || 
      addr.includes('dhurwa') || 
      addr.includes('namkum') || 
      addr.includes('khelgaon') || 
      addr.includes('pandra') || 
      addr.includes('ratu road') ||
      addr.includes('pisko') ||
      addr.includes('sarmoli')
    ) {
      return 75;
    }

    // Tier 4: Very Far (~ above 15km) -> ₹100
    if (
      addr.includes('mesra') || 
      addr.includes('bit mesra') || 
      addr.includes('tupudana') || 
      addr.includes('ormanjhi') || 
      addr.includes('kanke') || 
      addr.includes('vikas') ||
      addr.includes('sidroll')
    ) {
      return 100;
    }

    // Tier 2: Close-Medium (~ 3km - 8km) -> ₹50 (Default close areas)
    if (
      addr.includes('kutchery') || 
      addr.includes('morabadi') || 
      addr.includes('bariatu') || 
      addr.includes('kokar') || 
      addr.includes('kantatoli') || 
      addr.includes('bahubazar') || 
      addr.includes('kadru') ||
      addr.includes('harmu') ||
      addr.includes('ashok nagar') ||
      addr.includes('argora')
    ) {
      return 50;
    }

    return 50; // default standard delivery charge
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = t('forms.valName');
    if (!phone.trim()) {
      errors.phone = t('forms.valPhone');
    } else if (phone.trim().replace(/[^0-9]/g, '').length < 10) {
      errors.phone = t('forms.valPhoneLen');
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('forms.valEmail');
    }
    if (!address.trim()) errors.address = t('forms.valAddress');
    
    // Validate medicine items
    const itemErrors = [];
    medicineItems.forEach((itm, idx) => {
      if (!itm.name.trim()) {
        itemErrors[idx] = t('forms.valMedName');
      }
      if (itm.potency === 'custom' && !itm.customPotency.trim()) {
        itemErrors[idx] = t('forms.valCustomPotency');
      }
      if (itm.bottleSize === 'custom' && !itm.customBottleSize.trim()) {
        itemErrors[idx] = t('forms.valCustomSize');
      }
    });

    if (itemErrors.length > 0) {
      errors.medicineItems = itemErrors;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEstimatePrices = async () => {
    const firstEmptyIndex = medicineItems.findIndex(itm => !itm.name.trim());
    if (firstEmptyIndex !== -1) {
      setEstimateError(t('forms.valAllMeds', { row: firstEmptyIndex + 1 }));
      return;
    }
    
    setEstimateError('');
    setEstimating(true);
    setEstimatedData(null);

    try {
      const res = await fetch('/api/estimatePrice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: medicineItems,
          address: address.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEstimatedData(data);
      } else {
        setEstimateError(data.message || 'AI price estimation failed. Please try again.');
      }
    } catch (err) {
      console.error('AI Price estimation fetch error:', err);
      setEstimateError('Could not reach the AI price estimator. Please try again.');
    } finally {
      setEstimating(false);
    }
  };

  const handleRetailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validate()) return;

    setSubmitting(true);

    let currentEstimate = estimatedData;
    if (!currentEstimate) {
      try {
        const res = await fetch('/api/estimatePrice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            items: medicineItems,
            address: address.trim()
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentEstimate = data;
        }
      } catch (err) {
        console.error('Silent pricing estimate failed, using hard defaults:', err);
      }

      if (!currentEstimate) {
        let fallbackSubtotal = 0;
        const fallbackItems = medicineItems.map(itm => {
          const potency = itm.potency === 'custom' ? itm.customPotency : itm.potency;
          const size = itm.bottleSize === 'custom' ? itm.customBottleSize : itm.bottleSize;
          const total = 120 * itm.quantity;
          fallbackSubtotal += total;
          return { name: `${itm.name} ${potency} (${size})`, quantity: itm.quantity, estimatedUnitPrice: 120, totalPrice: total };
        });

        const localDelCharge = calculateLocalDeliveryCharge(address.trim(), fallbackSubtotal);
        currentEstimate = {
          subtotal: fallbackSubtotal,
          discount: Math.round(fallbackSubtotal * 0.10),
          deliveryCharge: localDelCharge,
          grandTotal: fallbackSubtotal - Math.round(fallbackSubtotal * 0.10) + localDelCharge,
          items: fallbackItems
        };
      }
    }

    const medicinesSummary = medicineItems
      .map(itm => {
        const potency = itm.potency === 'custom' ? itm.customPotency : itm.potency;
        const size = itm.bottleSize === 'custom' ? itm.customBottleSize : itm.bottleSize;
        return `• ${itm.name} ${potency} (${size}) [Qty: ${itm.quantity}]`;
      })
      .join('\n');

    const payload = {
      customer_name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      medicines_list: medicinesSummary,
      estimated_subtotal: currentEstimate.subtotal,
      discount: currentEstimate.discount,
      delivery_charge: currentEstimate.deliveryCharge,
      total_price: currentEstimate.grandTotal,
      lead_status: 'Pending'
    };

    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, 'retail_orders'), {
          ...payload,
          created_at: new Date().toISOString()
        });
      } else {
        await mockDb.addRetailOrder(payload);
      }

      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'retail_order',
          data: {
            name: payload.customer_name,
            phone: payload.phone,
            email: payload.email,
            address: payload.address,
            medicines: payload.medicines_list,
            estimatedMedicinesPrice: payload.estimated_subtotal,
            deliveryCharge: payload.delivery_charge,
            discount: payload.discount,
            totalPrice: payload.total_price
          }
        })
      }).catch((sheetErr) => console.error('Google Sheets sync failed:', sheetErr));

      setOrderDetails(payload);
      setSuccess(true);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setMedicineItems([
        { name: '', potency: '30C', customPotency: '', bottleSize: '30ml', customBottleSize: '', quantity: 1 }
      ]);
      setEstimatedData(null);
      setValidationErrors({});
    } catch (err) {
      console.error('Retail order submission error:', err);
      setError(t('forms.valUnexpected'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = "block w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 focus:border-[#115E59] transition-all shadow-sm";

  return (
    <div className="bg-white rounded-2xl p-6 md:p-10 shadow-md shadow-[#EFEAE2] relative overflow-hidden border border-[#EAE5DC] max-w-5xl mx-auto">
      {/* Subtle warm decorative glows */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#115E59]/5 blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-[#0F766E]/5 blur-3xl"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column - context & info */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wider uppercase">
              {t('retail.badge')}
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">
              {t('retail.subTitleBuy')}
            </h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              {t('retail.descBuy')}
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-[#EAE5DC] pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#115E59] border border-emerald-200 shrink-0">
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('retail.deliveryTitle')}</h4>
                <p className="text-2xs text-[#64748B]">{t('retail.deliveryText')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0F766E] border border-teal-200 shrink-0">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('retail.deliveryTimeTitle')}</h4>
                <p className="text-2xs text-[#64748B]">{t('retail.deliveryTimeText')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 border border-sky-200 shrink-0">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('retail.shippingTitle')}</h4>
                <p className="text-2xs text-[#64748B]">{t('retail.shippingText')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200 shrink-0">
                <TicketPercent className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('retail.discountTitle')}</h4>
                <p className="text-2xs text-[#64748B]">{t('retail.discountText')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - form inputs & receipt */}
        <div className="lg:col-span-8">
          {success && orderDetails ? (
            <div className="animate-fade-in space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold">{t('forms.successTitle')}</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">{t('forms.successDesc')}</p>
                </div>
              </div>

              {/* Order Slip Summary */}
              <div className="bg-[#FDFBF7] border border-[#EAE5DC] rounded-2xl p-5 md:p-6 space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-neon"></div>
                <h4 className="font-extrabold text-sm text-[#115E59] uppercase tracking-wider border-b border-[#EAE5DC] pb-2 flex items-center gap-2">
                  <span>📋</span> {t('forms.summaryTitle')}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('forms.name')}</span>
                    <span className="font-bold text-slate-800">{orderDetails.customer_name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('forms.phone')}</span>
                    <span className="font-bold text-slate-800">{orderDetails.phone}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('forms.address')}</span>
                    <span className="font-semibold text-slate-800">{orderDetails.address}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('forms.summaryRequested')}</span>
                    <span className="font-medium text-slate-700 bg-white border border-slate-100 rounded-lg p-2.5 block whitespace-pre-wrap mt-1">{orderDetails.medicines_list}</span>
                  </div>
                </div>

                <div className="border-t border-[#EAE5DC] pt-3 mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{t('forms.subtotal')}</span>
                    <span className="font-semibold">₹{orderDetails.estimated_subtotal}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>{t('forms.discount')}</span>
                    <span className="font-semibold">-₹{orderDetails.discount}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('forms.deliveryFee')}</span>
                    <span>{orderDetails.delivery_charge === 0 ? 'FREE' : `₹${orderDetails.delivery_charge}`}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[#EAE5DC] pt-2 text-sm font-extrabold text-[#1E293B]">
                    <span>{t('forms.estimatedTotal')}</span>
                    <span className="text-[#115E59]">₹{orderDetails.total_price}</span>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Order Submission */}
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl flex items-start gap-2.5 text-xs text-[#0F766E] leading-relaxed">
                <span>💡</span>
                <div>
                  <strong className="text-teal-900 font-bold block mb-0.5">{t('forms.whatsAppTipTitle')}</strong>
                  {t('forms.whatsAppTipText')}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/919431360455?text=${encodeURIComponent(
                    `Hello Kanchan Homoeo Hall,\n\nI want to buy homeopathic medicines retail!\n\n👤 *Customer*: ${orderDetails.customer_name}\n📞 *Phone*: ${orderDetails.phone}\n📍 *Delivery Address*: ${orderDetails.address}\n\n💊 *Medicines requested*:\n${orderDetails.medicines_list}\n\n--- Price Breakdown ---\n💰 *Subtotal*: ₹${orderDetails.estimated_subtotal}\n🏷️ *Discount (10%)*: -₹${orderDetails.discount}\n🚚 *Delivery Charge*: ${orderDetails.delivery_charge === 0 ? 'FREE' : `₹${orderDetails.delivery_charge}`}\n🏁 *Total Estimated*: *₹${orderDetails.total_price}*\n\nPlease dispatch. Thank you!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-6 bg-[#25D366] hover:bg-[#1EBE57] text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('forms.whatsAppBtn')}
                </a>
                
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setOrderDetails(null);
                  }}
                  className="btn-neon-cyan-outline py-3 px-6 rounded-xl text-xs uppercase tracking-wider font-bold"
                >
                  {t('forms.submitAnother')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRetailSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <h4 className="text-sm font-bold">{t('forms.errorTitle')}</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="retail-name" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                    {t('forms.name')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      id="retail-name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationErrors.name) setValidationErrors(p => ({ ...p, name: '' }));
                      }}
                      placeholder={t('forms.namePlaceholder')}
                      className={inputClasses}
                    />
                  </div>
                  {validationErrors.name && (
                    <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.name}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label htmlFor="retail-phone" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                    {t('forms.phone')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      id="retail-phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (validationErrors.phone) setValidationErrors(p => ({ ...p, phone: '' }));
                      }}
                      placeholder={t('forms.phonePlaceholder')}
                      className={inputClasses}
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.phone}</p>
                  )}
                </div>

                {/* Email (Optional) */}
                <div className="md:col-span-2">
                  <label htmlFor="retail-email" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                    {t('forms.email')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      id="retail-email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (validationErrors.email) setValidationErrors(p => ({ ...p, email: '' }));
                      }}
                      placeholder={t('forms.emailPlaceholder')}
                      className={inputClasses}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.email}</p>
                  )}
                </div>

                {/* Delivery Address */}
                <div className="md:col-span-2">
                  <label htmlFor="retail-address" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                    {t('forms.address')}
                  </label>
                  <div className="relative">
                    <span className="absolute top-3 left-3.5 text-[#94A3B8]">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <textarea
                      id="retail-address"
                      rows="2"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (validationErrors.address) setValidationErrors(p => ({ ...p, address: '' }));
                      }}
                      placeholder={t('forms.addressPlaceholder')}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 focus:border-[#115E59] transition-all resize-none shadow-sm"
                    />
                  </div>
                  {validationErrors.address && (
                    <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.address}</p>
                  )}
                </div>

                {/* STRUCTURED MEDICINES BUILDER */}
                <div className="md:col-span-2 space-y-4">
                  <label className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest">
                    {t('forms.medicinesToBuy')}
                  </label>
                  
                  <div className="space-y-4">
                    {medicineItems.map((item, index) => (
                      <div 
                        key={index} 
                        className="bg-[#F9F6F0]/40 border border-[#EAE5DC] rounded-2xl p-4 space-y-3 relative group transition-all hover:bg-[#FDFBF7]"
                      >
                        {/* Remove Button for Item Row */}
                        {medicineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMedicineRow(index)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50 border-0 bg-transparent cursor-pointer"
                            title="Remove this medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Title of row */}
                        <div className="text-[10px] font-extrabold text-[#115E59] uppercase tracking-wider flex items-center gap-1.5">
                          <span>📦</span> {t('forms.medicinesToBuy') === 'Medicines to Buy' ? `Medicine Item #${index + 1}` : `दवा सामग्री #${index + 1}`}
                        </div>

                        {/* Input Row Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                          {/* Medicine Name */}
                          <div className="md:col-span-4">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{t('forms.medicineName')}</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateMedicineRow(index, 'name', e.target.value)}
                              placeholder={t('forms.medicineNamePlaceholder')}
                              className="block w-full px-3 py-2 text-xs bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 transition-all shadow-sm"
                            />
                            {validationErrors.medicineItems?.[index] && (
                              <p className="text-[9px] text-rose-600 mt-1 font-semibold pl-0.5">{validationErrors.medicineItems[index]}</p>
                            )}
                          </div>

                          {/* Potency */}
                          <div className="md:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{t('forms.potency')}</label>
                            <select
                              value={item.potency}
                              onChange={(e) => updateMedicineRow(index, 'potency', e.target.value)}
                              className="block w-full px-3 py-2 text-xs bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 transition-all shadow-sm"
                            >
                              <option value="30C">{language === 'en' ? '30C (Standard Dilution)' : '30C (मानक डाइल्यूशन)'}</option>
                              <option value="200C">{language === 'en' ? '200C (Standard Dilution)' : '200C (मानक डाइल्यूशन)'}</option>
                              <option value="1M">{language === 'en' ? '1M (High Dilution)' : '1M (उच्च डाइल्यूशन)'}</option>
                              <option value="Q">{language === 'en' ? 'Q (Mother Tincture)' : 'Q (मदर टिंचर)'}</option>
                              <option value="6X">{language === 'en' ? '6X (Tissue Salt)' : '6X (टिशू साल्ट)'}</option>
                              <option value="12X">{language === 'en' ? '12X (Tissue Salt)' : '12X (टिशू साल्ट)'}</option>
                              <option value="30X">{language === 'en' ? '30X (Tissue Salt)' : '30X (टिशू साल्ट)'}</option>
                              <option value="custom">{language === 'en' ? 'Other / Custom' : 'अन्य / कस्टम'}</option>
                            </select>
                            
                            {item.potency === 'custom' && (
                              <input
                                type="text"
                                value={item.customPotency}
                                onChange={(e) => updateMedicineRow(index, 'customPotency', e.target.value)}
                                placeholder="Specify potency (e.g. 3X, 200CH)"
                                className="block w-full px-3 py-1.5 text-xs bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 transition-all mt-1.5 shadow-sm"
                              />
                            )}
                          </div>

                          {/* Bottle Size */}
                          <div className="md:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{t('forms.bottleSize')}</label>
                            <select
                              value={item.bottleSize}
                              onChange={(e) => updateMedicineRow(index, 'bottleSize', e.target.value)}
                              className="block w-full px-3 py-2 text-xs bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 transition-all shadow-sm"
                            >
                              <option value="30ml">{language === 'en' ? '30 ml (Standard Liquid)' : '30 ml (मानक लिक्विड)'}</option>
                              <option value="100ml">{language === 'en' ? '100 ml (Large Liquid)' : '100 ml (बड़ा लिक्विड)'}</option>
                              <option value="450ml">{language === 'en' ? '450 ml (Clinic/Bulk Liquid)' : '450 ml (थोक लिक्विड)'}</option>
                              <option value="15g (Tablets)">{language === 'en' ? '15g (Standard Tablets)' : '15 ग्राम (मानक गोलियां)'}</option>
                              <option value="25g (Tablets)">{language === 'en' ? '25g (Large Tablets)' : '25 ग्राम (बड़ी गोलियां)'}</option>
                              <option value="custom">{language === 'en' ? 'Other / Custom' : 'अन्य / कस्टम'}</option>
                            </select>

                            {item.bottleSize === 'custom' && (
                              <input
                                type="text"
                                value={item.customBottleSize}
                                onChange={(e) => updateMedicineRow(index, 'customBottleSize', e.target.value)}
                                placeholder="Specify size (e.g. 450g, 1 dram)"
                                className="block w-full px-3 py-1.5 text-xs bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 transition-all mt-1.5 shadow-sm"
                              />
                            )}
                          </div>

                          {/* Quantity Counter */}
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{t('forms.qty')}</label>
                            <div className="flex items-center bg-white border border-[#EAE5DC] rounded-xl overflow-hidden shadow-sm h-8.5 w-full">
                              <button
                                type="button"
                                onClick={() => decrementQty(index)}
                                className="flex-1 text-center font-bold text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors h-full flex items-center justify-center border-r border-[#EAE5DC] bg-transparent border-0 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center text-xs font-bold text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementQty(index)}
                                className="flex-1 text-center font-bold text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors h-full flex items-center justify-center border-l border-[#EAE5DC] bg-transparent border-0 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Add Row Button */}
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="py-2.5 px-4 bg-teal-50/50 hover:bg-teal-50 border border-dashed border-[#115E59]/30 hover:border-[#115E59] text-[#115E59] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full group shadow-sm"
                  >
                    <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    {t('forms.addMedicine')}
                  </button>
                </div>
              </div>

              {/* AI Estimator Trigger & Results */}
              <div className="bg-[#F9F6F0]/65 border border-[#EAE5DC] rounded-xl p-4.5 space-y-3 relative overflow-hidden transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#115E59] animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('forms.aiEstimator')}</h4>
                      <p className="text-[10px] text-slate-500">{t('forms.aiEstimatorDesc')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={estimating}
                    onClick={handleEstimatePrices}
                    className="py-1.5 px-4 bg-teal-50 border border-teal-200 text-[#0F766E] rounded-lg text-2xs font-bold uppercase tracking-wider hover:bg-teal-100/60 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {estimating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('forms.aiEstimating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-[#0F766E]" />
                        {t('forms.aiEstimateBtn')}
                      </>
                    )}
                  </button>
                </div>

                {estimateError && (
                  <p className="text-2xs text-rose-600 font-semibold">{estimateError}</p>
                )}

                {estimatedData && (
                  <div className="bg-white border border-[#EAE5DC] rounded-lg p-3.5 text-2xs space-y-3 animate-fade-in shadow-inner">
                    <h5 className="font-extrabold text-[10px] text-[#115E59] uppercase tracking-wider border-b border-slate-100 pb-1">{t('forms.aiBreakdown')}</h5>
                    
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {estimatedData.items?.map((itm, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-600">
                          <span>{itm.name} <strong className="text-slate-400">({itm.quantity}x)</strong></span>
                          <span>₹{itm.totalPrice} <span className="text-[9px] text-slate-400">(₹{itm.estimatedUnitPrice}/ea)</span></span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#EAE5DC] pt-2 space-y-1 font-medium">
                      <div className="flex justify-between text-slate-600">
                        <span>{t('forms.subtotal')}</span>
                        <span>₹{estimatedData.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>{t('forms.discount')}</span>
                        <span>-₹{estimatedData.discount}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{t('forms.deliveryFee')}</span>
                        <span>{estimatedData.deliveryCharge === 0 ? 'FREE' : `₹${estimatedData.deliveryCharge}`}</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-[#EAE5DC] pt-1.5 text-xs font-extrabold text-slate-900">
                        <span>{t('forms.estimatedTotal')}</span>
                        <span className="text-[#115E59]">₹{estimatedData.grandTotal}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 leading-relaxed italic border-t border-slate-100 pt-1.5">
                      💡 {language === 'en' ? 'Price estimates are approximate and based on standard Indian homeopathic pricing lists.' : 'मूल्य अनुमान अनुमानित हैं और मानक भारतीय होम्योपैथिक मूल्य सूचियों पर आधारित हैं।'}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-neon-emerald py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-wider"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('forms.submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('forms.submitOrder')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
