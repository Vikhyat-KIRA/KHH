import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      console.warn("⚠️ Google Sheets credentials missing in environment. Using mock mode.");
      return res.status(200).json({ status: 'mock_mode', message: 'Credentials missing' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Helper to resolve dynamic monthly tab name for appointments
    const getMonthTabName = () => {
      const now = new Date();
      const year = now.getFullYear();
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthName = monthNames[now.getMonth()];
      return `Appointments_${monthName}_${year}`; // e.g. Appointments_May_2026
    };

    const appointmentsTab = getMonthTabName();

    // Fetch spreadsheet metadata to check which tabs exist
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const sheetTitles = spreadsheet.data.sheets.map(s => s.properties.title);

    // Helper function to read a sheet and return the last 20 rows mapped to objects
    const readSheetData = async (tabName, keys) => {
      if (!sheetTitles.includes(tabName)) {
        return [];
      }
      
      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!A2:K`, // start from A2 to skip headers
      });
      
      const rows = readRes.data.values || [];
      
      // Get the last 20 rows and map them (newest first)
      const last20 = rows.slice(-20).reverse(); 
      
      return last20.map((row, index) => {
        const obj = { id: `${tabName}_${index}` };
        keys.forEach((key, i) => {
          obj[key] = row[i] || '';
        });
        return obj;
      });
    };

    const retailKeys = [
      'timestamp', 'customerName', 'phone', 'email', 'address', 
      'medicinesList', 'estimatedMedicinesPrice', 'deliveryCharge', 
      'discount', 'totalEstimatedPrice', 'status'
    ];
    
    const b2bKeys = [
      'timestamp', 'contactName', 'companyName', 'email', 'phone', 
      'estimatedQuantity', 'requirements'
    ];
    
    const appointmentKeys = [
      'timestamp', 'patientName', 'patientPhone', 'appointmentDate', 'timeSlot', 'status'
    ];

    const [retailOrders, b2bQueries, appointments] = await Promise.all([
      readSheetData('Retail_Orders', retailKeys),
      readSheetData('B2B_Queries', b2bKeys),
      readSheetData(appointmentsTab, appointmentKeys)
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        retailOrders,
        b2bQueries,
        appointments
      }
    });

  } catch (error) {
    console.error('❌ Error reading Google Sheets:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
