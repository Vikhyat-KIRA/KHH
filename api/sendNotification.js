export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { patient_name, patient_phone, appointment_date, time_slot } = req.body;

    if (!patient_name || !patient_phone || !appointment_date || !time_slot) {
      return res.status(400).json({ message: 'Missing required appointment fields' });
    }

    // Retrieve Twilio credentials from environment variables securely
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER; // Twilio phone number
    const targetPhoneNumber = patient_phone.replace(/\s+/g, ''); // strip spaces

    // Standardize phone number format for Indian country code (+91) if needed
    let formattedPhone = targetPhoneNumber;
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
        formattedPhone = `+${formattedPhone}`;
      }
    }

    if (!accountSid || !authToken || !fromNumber) {
      console.warn("⚠️ Twilio credentials missing in environment. Mocking successful SMS notification.");
      return res.status(200).json({
        status: 'mock_success',
        message: 'Twilio credentials not configured, mock SMS sent successfully.',
        recipient: formattedPhone,
        text: `Hello ${patient_name}, your appointment request at Kanchan Homoeo Hall for ${appointment_date} at ${time_slot} is received and pending confirmation.`
      });
    }

    // Prepare body message
    const messageBody = `Hello ${patient_name},\n\nYour appointment request at Kanchan Homoeo Hall is received!\n\n📅 Date: ${appointment_date}\n🕒 Time: ${time_slot}\nStatus: Pending Confirmation\n\nWe will reach out to you shortly. Thank you!\n- Kanchan Homoeo Hall, Ranchi`;

    // Construct Basic Authentication Header for Twilio
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // Make direct serverless call to Twilio SMS API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: formattedPhone,
          Body: messageBody
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send SMS through Twilio');
    }

    console.log(`✅ SMS Notification successfully sent via Twilio to ${formattedPhone}. Message SID: ${data.sid}`);
    return res.status(200).json({ status: 'success', sid: data.sid });
  } catch (error) {
    console.error('❌ Error sending SMS notification:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
