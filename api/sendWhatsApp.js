/**
 * Vercel Serverless Function: /api/sendWhatsApp
 *
 * Sends an automated WhatsApp message via:
 *   1. Free Baileys/WA Bridge (priority)
 *   2. Meta WhatsApp Cloud API (fallback)
 *
 * Required env vars (set in Vercel dashboard):
 *   WHATSAPP_PHONE_NUMBER_ID   — from Meta Developer Console
 *   WHATSAPP_ACCESS_TOKEN      — permanent token from Meta
 *   VITE_WHATSAPP_BRIDGE_URL   — optional free bridge URL
 *   VITE_WHATSAPP_BRIDGE_API_KEY — optional bridge API key
 *
 * Supported `type` values in POST body:
 *   'retail_order'           — new order placed (customer confirmation)
 *   'retail_status_update'   — admin changes order status
 *   'retail_price_update'    — admin confirms/edits final price
 *   'appointment'            — new appointment booked
 *   'appointment_status'     — admin changes appointment status
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const {
      type = 'appointment',
      // New order
      patient_name,
      patient_phone,
      appointment_date,
      time_slot,
      customer_name,
      phone,
      medicines_list,
      total_price,
      address,
      // Status / price updates
      order_status,
      new_price,
      apt_status,
      apt_date,
      apt_slot,
    } = req.body;

    let recipientPhone = '';
    let messageText = '';

    // ─────────────────────────────────────────────────────────────────
    // 1. Retail Order — New Order Placed
    // ─────────────────────────────────────────────────────────────────
    if (type === 'retail_order') {
      if (!customer_name || !phone || !medicines_list || !address) {
        return res.status(400).json({ message: 'Missing required B2C order fields.' });
      }
      recipientPhone = phone;
      messageText =
        `Hello ${customer_name}! 👋\n\n` +
        `Your remedies order at *Kanchan Homoeo Hall* has been successfully placed! 📦✅\n\n` +
        `💊 *Medicines ordered:*\n${medicines_list}\n\n` +
        `💵 *Estimated Total:* ₹${total_price}\n` +
        `📍 *Delivery Address:* ${address}\n\n` +
        `Our pharmacist is reviewing your order and will confirm the final price shortly. Thank you for choosing us! 🌿\n\n` +
        `— Kanchan Homoeo Hall`;

    // ─────────────────────────────────────────────────────────────────
    // 2. Retail Order — Status Update by Admin
    // ─────────────────────────────────────────────────────────────────
    } else if (type === 'retail_status_update') {
      if (!customer_name || !phone || !order_status) {
        return res.status(400).json({ message: 'Missing fields for status update.' });
      }
      recipientPhone = phone;
      const priceStr = total_price && total_price !== 'TBD'
        ? `₹${total_price}`
        : 'TBD (pending verification)';

      const statusMessages = {
        'Booked': (
          `Hello ${customer_name}! 👋\n\n` +
          `📦 Your order from *Kanchan Homoeo Hall* has been *CONFIRMED & BOOKED*!\n\n` +
          `💊 *Medicines:*\n${medicines_list || ''}\n\n` +
          `💰 *Order Total:* ${priceStr}\n\n` +
          `We are preparing your package. You'll be notified when it's out for delivery. Thank you! 🙏`
        ),
        'Out for Delivery': (
          `Hello ${customer_name}! 👋\n\n` +
          `🚚 Great news! Your order from *Kanchan Homoeo Hall* is now *OUT FOR DELIVERY*!\n\n` +
          `💊 *Medicines:*\n${medicines_list || ''}\n\n` +
          `💰 *Total:* ${priceStr}\n\n` +
          `Please be available to receive your parcel. Thank you! 🙏`
        ),
        'Delivered': (
          `Hello ${customer_name}! 👋\n\n` +
          `✅ Your order from *Kanchan Homoeo Hall* has been *DELIVERED*!\n\n` +
          `💊 *Medicines:*\n${medicines_list || ''}\n\n` +
          `Thank you for choosing us! For any concerns, please reply to this message. 🙏`
        ),
        'Out of Stock': (
          `Hello ${customer_name}! 👋\n\n` +
          `⚠️ We regret to inform you that one or more medicines in your order from *Kanchan Homoeo Hall* are currently *OUT OF STOCK*.\n\n` +
          `💊 *Your Order:*\n${medicines_list || ''}\n\n` +
          `We will update you as soon as stock is available. Sorry for the inconvenience! 🙏`
        ),
        'Cancelled': (
          `Hello ${customer_name}! 👋\n\n` +
          `❌ Your order from *Kanchan Homoeo Hall* has been *CANCELLED*.\n\n` +
          `💊 *Medicines:*\n${medicines_list || ''}\n\n` +
          `If you have questions, please reach out to us. We apologize for the inconvenience. 🙏`
        ),
        'Pending': (
          `Hello ${customer_name}! 👋\n\n` +
          `⏳ Your order from *Kanchan Homoeo Hall* is currently being *REVIEWED*.\n\n` +
          `💊 *Medicines:*\n${medicines_list || ''}\n\n` +
          `We will confirm shortly. Thank you for your patience! 🙏`
        ),
      };
      messageText = statusMessages[order_status]
        || `Hello ${customer_name}, your order status has been updated to *${order_status}*. — Kanchan Homoeo Hall`;

    // ─────────────────────────────────────────────────────────────────
    // 3. Retail Order — Price Confirmed by Admin
    // ─────────────────────────────────────────────────────────────────
    } else if (type === 'retail_price_update') {
      if (!customer_name || !phone || !new_price) {
        return res.status(400).json({ message: 'Missing fields for price update.' });
      }
      recipientPhone = phone;
      messageText =
        `Hello ${customer_name}! 👋\n\n` +
        `Your retail order from *Kanchan Homoeo Hall* has been verified by our pharmacist!\n\n` +
        `💊 *Medicines:*\n${medicines_list || ''}\n\n` +
        `✅ *Confirmed MRP Total:* *₹${new_price}* (after 10% clinic discount)\n\n` +
        `We are preparing your package for dispatch. Thank you! 🙏\n\n` +
        `— Kanchan Homoeo Hall`;

    // ─────────────────────────────────────────────────────────────────
    // 4. Appointment — New Booking
    // ─────────────────────────────────────────────────────────────────
    } else if (type === 'appointment') {
      if (!patient_name || !patient_phone || !appointment_date || !time_slot) {
        return res.status(400).json({ message: 'Missing required appointment fields.' });
      }
      recipientPhone = patient_phone;
      const dateObj = new Date(appointment_date);
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      messageText =
        `Hello ${patient_name}! 👋\n\n` +
        `Your appointment at *Kanchan Homoeo Hall* has been successfully booked! ✅\n\n` +
        `📅 *Date:* ${formattedDate}\n` +
        `🕒 *Time:* ${time_slot}\n\n` +
        `📍 *Address:* Near Mahabir Chowk, PyadaToli, Upper Bazar, Ranchi.\n\n` +
        `Thank you for choosing us for holistic, natural care. We look forward to seeing you! 🌿\n\n` +
        `— Kanchan Homoeo Hall`;

    // ─────────────────────────────────────────────────────────────────
    // 5. Appointment — Status Update by Admin
    // ─────────────────────────────────────────────────────────────────
    } else if (type === 'appointment_status') {
      if (!patient_name || !patient_phone || !apt_status) {
        return res.status(400).json({ message: 'Missing fields for appointment status update.' });
      }
      recipientPhone = patient_phone;
      const date = apt_date || '';
      const slot = apt_slot || '';

      const aptMessages = {
        'Confirmed': (
          `Hello ${patient_name}! 👋\n\n` +
          `✅ Your appointment at *Kanchan Homoeo Hall* has been *CONFIRMED*!\n\n` +
          `📅 *Date:* ${date}\n⏰ *Time Slot:* ${slot}\n\n` +
          `Please arrive 5 minutes early. See you soon! 🙏`
        ),
        'CANCELLED': (
          `Hello ${patient_name}! 👋\n\n` +
          `❌ Your appointment at *Kanchan Homoeo Hall* on *${date}* (${slot}) has been *CANCELLED*.\n\n` +
          `We apologize for the inconvenience. Please contact us to reschedule. 🙏`
        ),
        'Pending': (
          `Hello ${patient_name}! 👋\n\n` +
          `⏳ Your appointment request at *Kanchan Homoeo Hall* for *${date}* (${slot}) is under review.\n\n` +
          `We will confirm shortly. Thank you for your patience! 🙏`
        ),
      };
      messageText = aptMessages[apt_status]
        || `Hello ${patient_name}, your appointment status has been updated to *${apt_status}*. — Kanchan Homoeo Hall`;

    } else {
      return res.status(400).json({ message: `Unknown message type: ${type}` });
    }

    // ─────────────────────────────────────────────────────────────────
    // Normalize phone to E.164
    // ─────────────────────────────────────────────────────────────────
    let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    // ─────────────────────────────────────────────────────────────────
    // Gateway 1: Free Baileys WhatsApp Bridge
    // ─────────────────────────────────────────────────────────────────
    const bridgeUrl = process.env.VITE_WHATSAPP_BRIDGE_URL || process.env.WHATSAPP_BRIDGE_URL;
    const bridgeApiKey = process.env.VITE_WHATSAPP_BRIDGE_API_KEY || process.env.WHATSAPP_BRIDGE_API_KEY;

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
          console.log(`✅ Sent via free bridge to ${cleanPhone}.`);
          return res.status(200).json({ status: 'success', gateway: 'free_bridge', recipient: cleanPhone });
        }
        console.warn('⚠️ Free bridge failed:', bridgeData);
      } catch (err) {
        console.error('❌ Bridge connection failed, trying Meta API:', err);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // Gateway 2: Meta WhatsApp Cloud API
    // ─────────────────────────────────────────────────────────────────
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken  = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn('⚠️ Meta WhatsApp credentials not configured — mock success returned.');
      return res.status(200).json({
        status: 'mock_success',
        message: 'WhatsApp credentials not set yet. Message was NOT actually sent.',
        messagePreview: messageText.slice(0, 100),
        recipient: cleanPhone
      });
    }

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

    console.log(`✅ Sent to ${cleanPhone} via Meta Cloud API. ID: ${data?.messages?.[0]?.id}`);
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
