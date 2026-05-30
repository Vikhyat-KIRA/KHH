import React, { useState } from 'react';
import { Building2, User, Mail, Phone, PackageOpen, ClipboardEdit, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { collection, addDoc } from 'firebase/firestore';

export default function BulkForm() {
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
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!company.trim()) errors.company = 'Organization / clinic name is required.';
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please provide a valid business email address.';
    }
    if (!phone.trim()) errors.phone = 'Contact phone number is required.';
    if (!quantity.trim()) {
      errors.quantity = 'Estimated quantity is required.';
    } else if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      errors.quantity = 'Quantity must be a positive number.';
    } else if (Number(quantity) < 50) {
      errors.quantity = 'Minimum order quantity is 50 units for wholesale medical batches.';
    }
    if (!requirements.trim()) {
      errors.requirements = 'Please describe your bulk medicine requirements.';
    } else if (requirements.trim().length < 15) {
      errors.requirements = 'Please elaborate further (at least 15 characters).';
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
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      estimated_quantity: Number(quantity),
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
      setError('An unexpected error occurred. Please review your details or retry.');
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
              Institutional Supply &amp; Bulk Orders
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">
              Bulk Medicine Distribution
            </h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Inquire for Bulk Medicine Distribution, Corporate Healthcare Supplies, or Specialized Clinic Batch Requirements. We supply certified homoeopathic dilutions, mother tinctures, bio-chemic tablets, and custom remedy kits in institutional volumes.
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-[#EAE5DC] pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#115E59] border border-emerald-200">
                🚀
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Fast Response</h4>
                <p className="text-2xs text-[#64748B]">Custom wholesale quotations within 24 hours.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0F766E] border border-teal-200">
                📦
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">MOQ: 50+ Units</h4>
                <p className="text-2xs text-[#64748B]">Tiered discounts for clinics, hospitals &amp; pharmacies.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200">
                🌿
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">GMP Certified</h4>
                <p className="text-2xs text-[#64748B]">All remedies sourced from AYUSH-approved manufacturers.</p>
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
                <h4 className="text-sm font-bold">Wholesale Inquiry Received</h4>
                <p className="text-xs text-[#64748B] mt-0.5">Your bulk medicine distribution request has been registered. A representative from Kanchan Homoeo Hall will contact you within 24 hours.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <h4 className="text-sm font-bold">Submission Error</h4>
                <p className="text-xs text-[#64748B] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label htmlFor="bulk-name" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                Full Representative Name
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
                Organization / Clinic Name
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
                  placeholder="e.g. Ranchi Wellness Clinic"
                  className={inputClasses}
                />
              </div>
              {validationErrors.company && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.company}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="bulk-email" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                Business Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  id="bulk-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) setValidationErrors(p => ({ ...p, email: '' }));
                  }}
                  placeholder="e.g. orders@yourclinic.com"
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
                Contact Phone
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
                  placeholder="e.g. 94313 60455"
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
                Required Volume (Units / Medical Batches)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <PackageOpen className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  id="bulk-quantity"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (validationErrors.quantity) setValidationErrors(p => ({ ...p, quantity: '' }));
                  }}
                  placeholder="Minimum order quantity: 50+ units / medical batches"
                  min="50"
                  className={inputClasses}
                />
              </div>
              {validationErrors.quantity && (
                <p className="text-2xs text-rose-600 mt-1 font-semibold pl-1">{validationErrors.quantity}</p>
              )}
            </div>

            <div>
              <label htmlFor="bulk-requirements" className="block text-2xs font-bold text-[#64748B] uppercase tracking-widest mb-1.5">
                Medicine Requirements &amp; Specifications
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
                  placeholder="Specify remedy names (e.g. Arnica 30C, Belladonna 200C), potencies, packaging formats (pills / liquid / tablets), delivery timelines, or any specialized clinic batch or corporate healthcare supply requirements..."
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
              className="w-full btn-neon-cyan-outline py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Wholesale Inquiry...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Wholesale Inquiry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
