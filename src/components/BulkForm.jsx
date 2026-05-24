import { useState } from 'react';
import { Building2, User, Mail, Phone, PackageOpen, ClipboardEdit, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

export default function BulkForm() {
  const { language, t } = useLanguage();

  // Input fields state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState('');
  const [requirements, setRequirements] = useState('');

  // UI state managers
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = t('forms.valName');
    if (!company.trim()) errors.company = t('bulkForm.valClinicName');
    if (!email.trim()) {
      errors.email = t('bulkForm.valLicense'); // actually lets keep standard message
      errors.email = language === 'en' ? 'Drug license number is required for trade rates.' : 'व्यापार दरों के लिए ड्रग लाइसेंस आवश्यक है।';
    }
    if (!phone.trim()) errors.phone = t('forms.valPhone');
    if (!quantity.trim()) {
      errors.quantity = language === 'en' ? 'Primary inquiry type is required.' : 'प्राथमिक पूछताछ प्रकार आवश्यक है।';
    }
    if (!requirements.trim()) {
      errors.requirements = t('bulkForm.valDetails');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      client_name: name.trim(),
      company_name: company.trim(),
      email: email.trim().toUpperCase(), // licenses usually uppercase
      phone: phone.trim(),
      estimated_quantity: quantity.trim(),
      requirements_text: requirements.trim(),
      lead_status: 'New'
    };

    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, 'bulk_orders'), {
          ...payload,
          created_at: new Date().toISOString()
        });
      } else {
        await mockDb.addBulkOrder(payload);
      }

      // Sync with Google Sheets — fire-and-forget
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'b2b_query',
          data: {
            name: payload.client_name,
            companyName: payload.company_name,
            email: payload.email,
            phone: payload.phone,
            quantity: payload.estimated_quantity,
            requirements: payload.requirements_text
          }
        })
      }).catch((sheetErr) => console.error('Google Sheets sync failed:', sheetErr));

      setSuccess(true);
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setQuantity('');
      setRequirements('');
      setValidationErrors({});
    } catch (err) {
      console.error('B2B bulk order error:', err);
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-semibold tracking-wider uppercase">
              {t('bulk.badge')}
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">
              {t('bulkForm.formTitle')}
            </h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              {t('bulkForm.formDesc')}
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-[#EAE5DC] pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#115E59] border border-emerald-200">
                🚀
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{language === 'en' ? 'Fast Response' : 'त्वरित प्रतिक्रिया'}</h4>
                <p className="text-2xs text-[#64748B]">{language === 'en' ? 'Custom wholesale quotations within 24 hours.' : '24 घंटे के भीतर थोक मूल्य उद्धरण।'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0F766E] border border-teal-200">
                📦
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{language === 'en' ? 'Institutional Trade Rates' : 'संस्थागत व्यापार दरें'}</h4>
                <p className="text-2xs text-[#64748B]">{language === 'en' ? 'Tiered discounts for clinics, hospitals & pharmacies.' : 'क्लीनिकों, अस्पतालों और फार्मेसियों के लिए श्रेणीबद्ध छूट।'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200">
                🌿
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('credibility.certTitle')}</h4>
                <p className="text-2xs text-[#64748B]">{language === 'en' ? 'All remedies sourced from premium licensed manufacturers (SBL, Dr. Reckeweg, Adel).' : 'सभी दवाएं प्रीमियम लाइसेंस प्राप्त निर्माताओं (SBL, डॉ. रेकवेग, एडेल) से प्राप्त की जाती हैं।'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - form inputs */}
        <form onSubmit={handleBulkSubmit} className="lg:col-span-8 space-y-5">
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <h4 className="text-sm font-bold">{t('bulkForm.successTitle')}</h4>
                <p className="text-xs text-[#64748B] mt-0.5">{t('bulkForm.successDesc')}</p>
              </div>
            </div>
          )}

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
              <label htmlFor="bulk-name" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                {language === 'en' ? 'Representative Full Name' : 'प्रतिनिधि का पूरा नाम'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="bulk-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.name) setValidationErrors(p => ({ ...p, name: '' }));
                  }}
                  placeholder="e.g. Dr. Anjali Sharma"
                  className={inputClasses}
                />
              </div>
              {validationErrors.name && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.name}</p>
              )}
            </div>

            {/* Organization / Clinic Name */}
            <div>
              <label htmlFor="bulk-company" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                {t('bulkForm.clinicName')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="bulk-company"
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    if (validationErrors.company) setValidationErrors(p => ({ ...p, company: '' }));
                  }}
                  placeholder={t('bulkForm.clinicPlaceholder')}
                  className={inputClasses}
                />
              </div>
              {validationErrors.company && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.company}</p>
              )}
            </div>

            {/* Drug License Number */}
            <div>
              <label htmlFor="bulk-email" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                {t('bulkForm.license')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="bulk-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) setValidationErrors(p => ({ ...p, email: '' }));
                  }}
                  placeholder={t('bulkForm.licensePlaceholder')}
                  className={inputClasses}
                />
              </div>
              {validationErrors.email && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="bulk-phone" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                {t('forms.phone')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  id="bulk-phone"
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
          </div>

          {/* Quantity & Requirements */}
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label htmlFor="bulk-quantity" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                {t('bulkForm.inquiryType')}
              </label>
              <select
                id="bulk-quantity"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (validationErrors.quantity) setValidationErrors(p => ({ ...p, quantity: '' }));
                }}
                className="block w-full px-3.5 py-2.5 text-sm bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 focus:border-[#115E59] transition-all shadow-sm"
              >
                <option value="">{t('bulkForm.selectType')}</option>
                <option value="chemist">{t('bulkForm.typeRetail')}</option>
                <option value="doctor">{t('bulkForm.typeDoctor')}</option>
                <option value="bulk_materials">{t('bulkForm.typeBulk')}</option>
                <option value="other">{t('bulkForm.typeOther')}</option>
              </select>
              {validationErrors.quantity && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.quantity}</p>
              )}
            </div>

            <div>
              <label htmlFor="bulk-requirements" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                {t('bulkForm.details')}
              </label>
              <div className="relative">
                <span className="absolute top-3 left-3.5 text-[#94A3B8]">
                  <ClipboardEdit className="w-4 h-4" />
                </span>
                <textarea
                  id="bulk-requirements"
                  rows="4"
                  value={requirements}
                  onChange={(e) => {
                    setRequirements(e.target.value);
                    if (validationErrors.requirements) setValidationErrors(p => ({ ...p, requirements: '' }));
                  }}
                  placeholder={t('bulkForm.detailsPlaceholder')}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[#EAE5DC] rounded-xl text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 focus:border-[#115E59] transition-all resize-none shadow-sm"
                />
              </div>
              {validationErrors.requirements && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.requirements}</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-neon-cyan-outline py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('bulkForm.submitting')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('bulkForm.submit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
