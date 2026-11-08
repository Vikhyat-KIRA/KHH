# Kanchan Homoeo Hall

Booking and ordering site for the clinic at Pyada Toli, Upper Bazar, Ranchi. Patients book appointments, place retail orders, or send a bulk inquiry. Staff work from the admin dashboard; records go to Google Sheets and confirmations go out on WhatsApp.

## Stack

Vite, React 19, Tailwind 4, Framer Motion, Firebase client SDK. Serverless functions in `api/` handle Sheets reads and writes, delivery price estimates, notifications and the WhatsApp relay. `whatsapp-bridge/` is a separate Node service and deploys on its own.

## Run it

```
npm install
cp .env.example .env
npm run dev
```

Fill `.env` before the first run. Nothing talks to Firebase without it.

## Ship it

Push to Vercel. `api/` becomes functions, `vercel.json` carries the config. Deploy `whatsapp-bridge/` separately (its README has the steps) and point `VITE_WHATSAPP_BRIDGE_URL` at it.

## Where things live

- `src/App.jsx`: shell, home view, footer
- `src/components/`: BookingCalendar, RetailForm, BulkForm, MyBookings, AdminDashboard
- `src/utils/translations.js`: English and Hindi strings
- `src/index.css`: palette, corner radii, buttons, panels
