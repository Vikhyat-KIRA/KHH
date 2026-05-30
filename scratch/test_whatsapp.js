async function testWhatsApp() {
  const payload = {
    phone: '9431360455',
    message: 'Hello! This is a test from your Kanchan Homoeo Hall automated booking system. The local WhatsApp bridge is now successfully configured and running! 🚀',
    apiKey: 'kanchan_secret_key_2026'
  };

  try {
    const response = await fetch('http://localhost:3001/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}

testWhatsApp();
