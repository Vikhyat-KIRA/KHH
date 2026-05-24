/**
 * Vercel Serverless Function: /api/estimatePrice
 * 
 * Estimates the retail prices of homeopathic medicines using the Gemini API.
 * Supports both structured list of items (name, potency, bottleSize, quantity)
 * and unstructured legacy text inputs.
 * 
 * Adheres strictly to the business requirements:
 *   - 24 Hour Ranchi delivery.
 *   - Delivery charge: 50 Rs.
 *   - Free delivery on orders above ₹500.
 *   - Discount: Upto 10% off.
 * 
 * If GEMINI_API_KEY is not configured in the server environment, it falls back
 * to a smart local pricing engine.
 */

function estimateDeliveryCharge(addressStr, subtotal) {
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
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { medicines, items, address } = req.body;

    // Check if we have either structured items or raw medicines text
    const hasItems = Array.isArray(items) && items.length > 0;
    const hasMedicinesText = medicines && medicines.trim();

    if (!hasItems && !hasMedicinesText) {
      return res.status(400).json({ message: 'Please provide a list of medicines to estimate.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
      console.log('🔮 Estimating prices using Gemini AI...');
      try {
        let inputDescription = '';
        if (hasItems) {
          inputDescription = `Structured list of items:\n${JSON.stringify(items, null, 2)}`;
        } else {
          inputDescription = `Unstructured customer text:\n"${medicines}"`;
        }

        const prompt = `You are a professional homeopathic pharmacist and price estimator for Kanchan Homoeo Hall in Ranchi, Jharkhand, India.
Given the customer's request:
${inputDescription}
Customer's delivery address (if provided): "${address || 'Not Provided'}"

Estimate realistic retail prices in Indian Rupees (INR) for each medicine.
Homeopathic pricing guidelines:
- Dilutions (potency: 30C, 200C, 1M, 30, 200, etc.):
  - 30ml size: ₹90 - ₹140 (standard: ₹110)
  - 100ml size: ₹250 - ₹340 (standard: ₹290)
  - 450ml size: ₹800 - ₹1100 (standard: ₹950)
- Mother Tinctures (potency Q or Mother Tincture):
  - 30ml size: ₹180 - ₹280 (standard: ₹220)
  - 100ml size: ₹450 - ₹650 (standard: ₹550)
  - 450ml size: ₹1600 - ₹2000 (standard: ₹1800)
- Bio-chemic Tablets/Salts:
  - 15g size: ₹80 - ₹120 (standard: ₹100)
  - 25g size: ₹130 - ₹190 (standard: ₹160)
  - 450g size: ₹1400 - ₹1800 (standard: ₹1600)
- If custom size or custom potency, calculate a plausible price.
- Multiply unit price by the quantity.

Perform the following calculations:
1. Subtotal: Sum of all medicine prices.
2. Discount: Exactly 10% of the medicine subtotal.
3. Delivery Charge:
   - If Subtotal is ₹500 or more: ₹0 (Free delivery!).
   - If Subtotal is under ₹500:
     - If the customer's address is not provided or is blank, default to ₹50.
     - If the address is provided, estimate the approximate road distance in km from Upper Bazar, Ranchi to that address.
     - Apply this distance-based dynamic pricing for delivery:
       - Under 3 km: ₹30
       - 3 km to 8 km: ₹50
       - 8 km to 15 km: ₹75
       - Above 15 km: ₹100
       - If the address is outside Ranchi city limits, explain and set a plausible shipping rate (e.g. ₹100).
4. Grand Total: Subtotal - Discount + Delivery Charge.

Return your response ONLY as a JSON object, with no markdown formatting or extra text. The structure MUST be exactly:
{
  "success": true,
  "items": [
    {
      "name": "Arnica 200C (30ml)",
      "quantity": 2,
      "estimatedUnitPrice": 120,
      "totalPrice": 240
    }
  ],
  "subtotal": 240,
  "discount": 24,
  "deliveryCharge": 50,
  "grandTotal": 266,
  "explanation": "Calculated based on standard 30ml homeopathic dilution rates and distance-based delivery charge."
}`;

        const apiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          throw new Error(`Gemini API responded with status ${apiRes.status}: ${errText}`);
        }

        const resData = await apiRes.json();
        const responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (responseText) {
          const parsed = JSON.parse(responseText.trim());
          console.log('✅ Price estimation completed successfully via Gemini AI.');
          return res.status(200).json(parsed);
        } else {
          throw new Error('Empty response from Gemini API.');
        }

      } catch (err) {
        console.warn('⚠️ Gemini AI pricing failed. Falling back to local pricing engine:', err.message);
        // Fall through to local fallback estimator
      }
    } else {
      console.log('ℹ️ Gemini API key missing. Using local rule-based price estimator.');
    }

    // --- LOCAL SMART FALLBACK ESTIMATOR ---
    let processedItems = [];
    let subtotal = 0;

    if (hasItems) {
      processedItems = items.map(itm => {
        const name = (itm.name || '').trim();
        const rawPotency = itm.potency === 'custom' ? itm.customPotency : itm.potency;
        const potency = (rawPotency || '30C').trim();
        const rawSize = itm.bottleSize === 'custom' ? itm.customBottleSize : itm.bottleSize;
        const size = (rawSize || '30ml').trim();
        const qty = parseInt(itm.quantity, 10) || 1;

        let unitPrice = 120; // default dilution 30ml
        const isQ = /\b[qQ]\b|mother/i.test(potency);
        const isTablet = /g\b|tablet/i.test(size);

        if (isQ) {
          if (size.includes('100ml')) unitPrice = 550;
          else if (size.includes('450ml')) unitPrice = 1800;
          else unitPrice = 220; // 30ml Q
        } else if (isTablet) {
          if (size.includes('25g')) unitPrice = 160;
          else if (size.includes('450g')) unitPrice = 1600;
          else unitPrice = 100; // 15g tablet
        } else {
          // Standard dilution
          if (size.includes('100ml')) unitPrice = 290;
          else if (size.includes('450ml')) unitPrice = 950;
          else unitPrice = 120; // 30ml dilution
        }

        const itemTotal = unitPrice * qty;
        subtotal += itemTotal;

        return {
          name: `${name} ${potency} (${size})`,
          quantity: qty,
          estimatedUnitPrice: unitPrice,
          totalPrice: itemTotal
        };
      }).filter(itm => itm.name.trim().length > 0);
    } else {
      // Legacy text parsing
      const lines = medicines
        .split(/[\n,;]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      for (const line of lines) {
        let qty = 1;
        let medName = line;

        const startMatch = line.match(/^(\d+)\s*(?:x|bottle|bottles|qty|units|pc|pcs)?\s+(.*)/i);
        const endMatch = line.match(/(.*?)\s*(?:x|-|\bqty\b|\bbottles\b)?\s*(\d+)$/i);

        if (startMatch) {
          qty = parseInt(startMatch[1], 10);
          medName = startMatch[2].trim();
        } else if (endMatch) {
          qty = parseInt(endMatch[2], 10);
          medName = endMatch[1].trim();
        }

        medName = medName
          .replace(/^[-*+\s]+/, '')
          .replace(/\s+(?:x|bottle|bottles|qty|units|pc|pcs)\s*$/i, '')
          .trim();

        if (!medName) continue;

        let estimatedUnitPrice = 130;
        if (/\b[qQ]\b|mother\s*tincture/i.test(medName)) {
          estimatedUnitPrice = 220;
        } else if (/\b(?:30[cC]?|200[cC]?|1[mM]|6[xX]|12[xX]|30|200)\b/i.test(medName)) {
          estimatedUnitPrice = 120;
        } else if (/tablet|tablets|biochemic|biochemical/i.test(medName)) {
          estimatedUnitPrice = 140;
        }

        const itemTotal = estimatedUnitPrice * qty;
        subtotal += itemTotal;

        processedItems.push({
          name: medName,
          quantity: qty,
          estimatedUnitPrice,
          totalPrice: itemTotal
        });
      }
    }

    if (processedItems.length === 0) {
      processedItems.push({
        name: 'Standard Homeopathic Consultation Package',
        quantity: 1,
        estimatedUnitPrice: 250,
        totalPrice: 250
      });
      subtotal = 250;
    }

    // Calculations based on requirements
    const discount = Math.round(subtotal * 0.10); // Exactly 10% discount
    const deliveryCharge = estimateDeliveryCharge(address, subtotal);
    const grandTotal = subtotal - discount + deliveryCharge;

    console.log('✅ Local price estimation completed.');
    return res.status(200).json({
      success: true,
      items: processedItems,
      subtotal,
      discount,
      deliveryCharge,
      grandTotal,
      explanation: 'Estimated using Kanchan standard homeopathic catalog rates (Local Fallback Mode).'
    });

  } catch (error) {
    console.error('❌ Price estimation error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
