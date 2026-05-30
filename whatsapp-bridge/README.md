# 📱 Kanchan Homoeo Hall: Free WhatsApp Automation Bridge

This is a standalone, lightweight Node.js microservice built specifically to run your automated WhatsApp notifications **completely for free**.

Unlike other automation tools, it does **NOT** require a heavy web browser (Chromium/Puppeteer). It communicates directly with WhatsApp servers using secure sockets, allowing it to run flawlessly in under **50MB of RAM**—perfectly suited for free hosting services like **Render** or **Railway**.

---

## 🚀 Easy Deploy Guide (Deploy to Render for Free)

### Step 1: Push to GitHub
Make sure this directory (`whatsapp-bridge/`) is pushed to your project's GitHub repository.

### Step 2: Set up a Free Web Service on Render
1. Go to [Render.com](https://render.com/) and log in (create a free account).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   * **Name**: `kanchan-whatsapp-bridge`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free` (0 USD/month)
5. Under **Environment**, add the following **Environment Variable**:
   * `BRIDGE_API_KEY`: Choose a secure password (e.g. `kanchan_secret_key_2026`). You will also put this in your main website settings so they can securely communicate.

### Step 3: Link Your Father's Phone (Scan QR Code)
1. Once deployed, Render will compile and start the server.
2. In your Render Dashboard, click on **Logs** on the left menu.
3. You will see a large QR code printed in the logs!
4. On your father's phone (`9431360455`), open **WhatsApp** and tap **Settings** (or the three dots) > **Linked Devices** > **Link a Device**.
5. Scan the QR code from the Render screen.
6. **Done!** The console logs will output:
   `✅ KANCHAN HOMOEO HALL: WhatsApp Gateway Connected successfully!`
7. Baileys will create an `auth_session` folder containing your login keys on the server. Even if the server restarts, your father's phone remains linked!

---

## 🔗 Connect it to Your Booking Site
Once the bridge is deployed, set these environment variables in your Vercel/Website Hosting settings:
* `VITE_WHATSAPP_BRIDGE_URL`: The URL Render gives you (e.g., `https://kanchan-whatsapp-bridge.onrender.com`).
* `VITE_WHATSAPP_BRIDGE_API_KEY`: The same `BRIDGE_API_KEY` you set above (e.g., `kanchan_secret_key_2026`).

That's it! Bookings made on your site will now instantly transmit fully automated WhatsApp confirmation slips to the patients completely for free!
