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
CRITICAL INSTRUCTION: You MUST use Google Search to find the EXACT and LATEST real-time Maximum Retail Price (MRP) in India (on sites like Tata 1mg, Homeomart, PharmEasy, or similar) for each medicine in the customer's request according to its brand (e.g., SBL, Dr. Reckeweg, Adel, Schwabe), size (e.g., 11ml, 20ml, 22ml, 30ml, 100ml, 15g, 25g, 450g), and potency (e.g., 30C, 200C, 1M, Q).
Since prices change frequently, you MUST base your estimate on the latest real-time MRP found on the web.

If you cannot find the exact real-time price or MRP of any requested medicine via live Google Search, do NOT fall back to standard baseline rates or guess. Instead, you MUST immediately return a failure JSON response indicating you had trouble connecting/fetching the live rates:
{
  "success": false,
  "message": "OOPS, had issues connecting the stats,Try Again."
}

Only if you successfully find the exact real-time prices for all medicines, multiply unit price by the quantity.

Perform the following calculations:
1. Subtotal: Sum of all medicine prices.
2. Discount: Exactly 10% of the medicine subtotal.
3. Delivery Charge:
   - If Subtotal is ₹500 or more: ₹0 (Free delivery!).
   - If Subtotal is under ₹500:
     - If the customer's address is not provided or is blank, default to ₹50.
     - If the address is provided, estimate the approximate road distance in km from Upper Bazar, Ranchi to that address.
      - Apply this distance-based dynamic pricing for delivery:
        - Under 5 km: ₹0 (Free delivery!)
        - 5 km to 8 km: ₹50
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
  "explanation": "Calculated based on real-time web-searched MRPs and distance-based delivery charge."
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
              tools: [
                {
                  google_search: {}
                }
              ],
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
        console.warn('⚠️ Gemini AI pricing failed:', err.message);
        return res.status(200).json({
          success: false,
          message: "OOPS, had issues connecting the stats,Try Again."
        });
      }
    } else {
      console.log('ℹ️ Gemini API key missing.');
      return res.status(200).json({
        success: false,
        message: "OOPS, had issues connecting the stats,Try Again."
      });
    }
  } catch (error) {
    console.error('❌ Price estimation error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
