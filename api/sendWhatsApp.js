/**
 * Vercel Serverless Function: /api/sendWhatsApp
 * 
 * Sends an automated WhatsApp message via Meta's official Cloud API.
 * Runs server-side so the access token is NEVER exposed to the browser.
 * 
 * Required environment variables (set in Vercel dashboard):
 *   WHATSAPP_PHONE_NUMBER_ID   — from Meta Developer Console
 *   WHATSAPP_ACCESS_TOKEN      — permanent token from Meta
 *   WHATSAPP_TEMPLATE_NAME     — template name (default: "appointment_confirmation")
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const {
      type = 'appointment',
      patient_name,
      patient_phone,
      appointment_date,
      time_slot,
      customer_name,
      phone,
      medicines_list,
      total_price,
      address
    } = req.body;

    let recipientPhone = '';
    let messageText = '';

    if (type === 'retail_order') {
      if (!customer_name || !phone || !medicines_list || !address) {
        return res.status(400).json({ message: 'Missing required B2C order fields.' });
      }
      recipientPhone = phone;

      // Build B2C order WhatsApp message
      messageText =
        `Hello ${customer_name}! 👋\n\n` +
        `Your remedies order at *Kanchan Homoeo Hall* has been successfully placed! 📦✅\n\n` +
        `💊 *Medicines ordered:*\n${medicines_list}\n\n` +
        `💵 *Total Price:* ₹${total_price}\n` +
        `📍 *Delivery Address:* ${address}\n\n` +
        `We are verifying your order details. Our pharmacist will match courier dispatch shortly. Thank you for choosing us! 🌿\n\n` +
        `— Kanchan Homoeo Hall`;
    } else {
      // Default to appointment
      if (!patient_name || !patient_phone || !appointment_date || !time_slot) {
        return res.status(400).json({ message: 'Missing required appointment fields.' });
      }
      recipientPhone = patient_phone;

      // Format date nicely for the message
      const dateObj = new Date(appointment_date);
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });

      // Build the WhatsApp message text
      messageText =
        `Hello ${patient_name}! 👋\n\n` +
        `Your appointment at *Kanchan Homoeo Hall* has been successfully booked! ✅\n\n` +
        `📅 *Date:* ${formattedDate}\n` +
        `🕒 *Time:* ${time_slot}\n\n` +
        `📍 *Address:* Near Mahabir Chowk, PyadaToli, Upper Bazar, Ranchi.\n\n` +
        `Thank you for choosing us for holistic, natural care. We look forward to seeing you! 🌿\n\n` +
        `— Kanchan Homoeo Hall`;
    }

    // Read credentials securely from server environment
    const bridgeUrl = process.env.VITE_WHATSAPP_BRIDGE_URL || process.env.WHATSAPP_BRIDGE_URL;
    const bridgeApiKey = process.env.VITE_WHATSAPP_BRIDGE_API_KEY || process.env.WHATSAPP_BRIDGE_API_KEY;

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken  = process.env.WHATSAPP_ACCESS_TOKEN;

    // Normalize phone number to E.164 format (e.g. 9431360455 → 919431360455)
    let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;          // add India country code
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.slice(1)}`; // replace leading 0 with 91
    }

    // 1. Check if the 100% Free Baileys WhatsApp Bridge is configured (priority fallback)
    if (bridgeUrl) {
      console.log('🔄 Routing through Free WhatsApp Bridge microservice...');
      try {
        const bridgeRes = await fetch(`${bridgeUrl.replace(/\/$/, '')}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message: messageText,
            apiKey: bridgeApiKey || 'kanchan_secret_key_2026'
          })
        });

        const bridgeData = await bridgeRes.json();

        if (bridgeRes.ok) {
          console.log(`✅ Message successfully routed and sent via free WhatsApp bridge to ${cleanPhone}.`);
          return res.status(200).json({
            status: 'success',
            gateway: 'free_bridge',
            recipient: cleanPhone
          });
        } else {
          console.warn('⚠️ Free bridge failed to send, falling back:', bridgeData);
        }
      } catch (err) {
        console.error('❌ Failed to connect to WhatsApp bridge service, falling back:', err);
      }
    }

    // 2. Fallback to official Meta Cloud API
    if (!phoneNumberId || !accessToken) {
      console.warn('⚠️ Meta WhatsApp credentials not configured — mock success returned.');
      return res.status(200).json({
        status: 'mock_success',
        message: 'WhatsApp credentials not set yet. Message was NOT actually sent.',
        recipient: recipientPhone
      });
    }

    // Call Meta WhatsApp Cloud API
    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: messageText }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Meta API error:', data);
      return res.status(response.status).json({
        message: 'Failed to send WhatsApp message.',
        error: data?.error?.message || 'Unknown Meta API error'
      });
    }

    console.log(`✅ WhatsApp message sent to ${cleanPhone} via Meta Cloud API. Message ID: ${data?.messages?.[0]?.id}`);
    return res.status(200).json({
      status: 'success',
      gateway: 'meta_cloud',
      messageId: data?.messages?.[0]?.id,
      recipient: cleanPhone
    });

  } catch (error) {
    console.error('❌ sendWhatsApp handler error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
