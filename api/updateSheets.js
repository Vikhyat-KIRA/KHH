import { google } from 'googleapis';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { type, data } = req.body;

    // We will extract these from the server environment securely
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      console.warn("⚠️ Google Sheets credentials missing in environment. Skipping sheet update.");
      return res.status(200).json({ status: 'mock_success', message: 'Credentials missing, but avoiding error on frontend' });
    }

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Fetch spreadsheet metadata to check if the tabs exist
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const sheetTitles = spreadsheet.data.sheets.map(s => s.properties.title);

    // Helper to resolve dynamic monthly tab names based on the appointment date (YYYY-MM-DD)
    const getMonthTabName = (dateStr) => {
      const parts = (dateStr || '').split('-');
      if (parts.length !== 3) return 'Appointments';
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthName = monthNames[monthNum - 1] || 'Unknown';
      return `Appointments_${monthName}_${year}`; // e.g. Appointments_May_2026
    };

    let targetTab = '';
    let headers = [];
    let range = '';
    let values = [];

    if (type === 'appointment') {
      targetTab = getMonthTabName(data.appointment_date);
      headers = ['Timestamp', 'Patient Name', 'Patient Phone', 'Appointment Date', 'Time Slot', 'Status'];
      range = `${targetTab}!A:F`;
      values = [[timestamp, data.patient_name, data.patient_phone, data.appointment_date, data.time_slot, 'Booked']];
    } else if (type === 'cancel_appointment') {
      // Normalize time slot — strip leading zero so "03:00 PM" matches "3:00 PM" in sheet
      const normalizeSlot = (s) => (s || '').replace(/^0/, '').trim().toUpperCase();
      const searchPhone = (data.patient_phone || '').trim();
      const searchDate  = (data.appointment_date || '').trim();
      const searchSlot  = normalizeSlot(data.time_slot);

      // Find the matching row and mark it CANCELLED in the correct month's sheet
      targetTab = getMonthTabName(data.appointment_date);

      // Check if target tab exists in the spreadsheet before attempting to read it
      if (!sheetTitles.includes(targetTab)) {
        console.warn(`Cancel: target tab ${targetTab} does not exist in the spreadsheet.`);
        return res.status(200).json({ status: 'not_found', message: `Sheet tab ${targetTab} does not exist.` });
      }

      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${targetTab}!A:F`,
      });
      const rows = readRes.data.values || [];
      // Columns: A=Timestamp B=Name C=Phone D=Date E=Slot F=Status (0-indexed: 2,3,4,5)
      let matchRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowPhone = (row[2] || '').trim();
        const rowDate  = (row[3] || '').trim();
        const rowSlot  = normalizeSlot(row[4]);
        const rowStatus = (row[5] || '').trim().toUpperCase();
        if (
          rowPhone === searchPhone &&
          rowDate  === searchDate  &&
          rowSlot  === searchSlot  &&
          rowStatus !== 'CANCELLED'
        ) {
          matchRowIndex = i + 1; // Sheets rows are 1-indexed
          break;
        }
      }
      if (matchRowIndex === -1) {
        console.warn('Cancel: no matching row found in sheet for', { searchPhone, searchDate, searchSlot });
        return res.status(200).json({ status: 'not_found', message: 'Row not found — may have already been cancelled or never logged.' });
      }
      // Stamp CANCELLED in Status column (F)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${targetTab}!F${matchRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['CANCELLED']] },
      });
      return res.status(200).json({ status: 'success', message: `Row ${matchRowIndex} marked CANCELLED in ${targetTab}.` });
    } else if (type === 'b2b_query') {
      targetTab = 'B2B_Queries';
      headers = ['Timestamp', 'Contact Name', 'Company Name', 'Email', 'Phone', 'Estimated Quantity', 'Requirements'];
      range = `${targetTab}!A:G`;
      values = [[timestamp, data.name, data.companyName, data.email, data.phone, data.quantity, data.requirements]];
    } else if (type === 'retail_order') {
      targetTab = 'Retail_Orders';
      headers = [
        'Timestamp', 'Customer Name', 'Phone', 'Email', 'Address', 
        'Medicines List', 'AI Estimated Medicines Price', 'Delivery Charge', 
        'Discount', 'Total Estimated Price', 'Status'
      ];
      range = `${targetTab}!A:K`;
      values = [[
        timestamp,
        data.name,
        data.phone,
        data.email,
        data.address,
        data.medicines,
        data.estimatedMedicinesPrice,
        data.deliveryCharge,
        data.discount,
        data.totalPrice,
        'Pending'
      ]];
    } else if (type === 'update_order_status') {
      const searchPhone = (data.phone || '').trim();
      const searchTimestamp = (data.timestamp || '').trim();
      const newStatus = (data.status || 'Pending').trim();

      targetTab = 'Retail_Orders';

      if (!sheetTitles.includes(targetTab)) {
        return res.status(200).json({ status: 'not_found', message: `Sheet tab ${targetTab} does not exist.` });
      }

      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${targetTab}!A:K`,
      });

      const rows = readRes.data.values || [];
      let matchRowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowPhone = (row[2] || '').trim();
        const rowTimestamp = (row[0] || '').trim();
        if (
          rowPhone === searchPhone &&
          (rowTimestamp === searchTimestamp || rowTimestamp.includes(searchTimestamp) || searchTimestamp.includes(rowTimestamp))
        ) {
          matchRowIndex = i + 1;
          break;
        }
      }

      if (matchRowIndex === -1) {
        // Fallback: match latest row with the same phone
        for (let i = rows.length - 1; i >= 1; i--) {
          const row = rows[i];
          const rowPhone = (row[2] || '').trim();
          if (rowPhone === searchPhone) {
            matchRowIndex = i + 1;
            break;
          }
        }
      }

      if (matchRowIndex === -1) {
        console.warn('Update status: no matching row found in sheet for', { searchPhone, searchTimestamp });
        return res.status(200).json({ status: 'not_found', message: 'Order row not found.' });
      }

      // Column K is the 11th column (Status)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${targetTab}!K${matchRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[newStatus]] },
      });

      return res.status(200).json({ status: 'success', data: { message: `Order status updated to ${newStatus} at row ${matchRowIndex}.` } });
    } else if (type === 'update_order_price') {
      const searchPhone = (data.phone || '').trim();
      const searchTimestamp = (data.timestamp || '').trim();
      const newPrice = (data.price || '').trim();

      targetTab = 'Retail_Orders';

      if (!sheetTitles.includes(targetTab)) {
        return res.status(200).json({ status: 'not_found', message: `Sheet tab ${targetTab} does not exist.` });
      }

      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${targetTab}!A:K`,
      });

      const rows = readRes.data.values || [];
      let matchRowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowPhone = (row[2] || '').trim();
        const rowTimestamp = (row[0] || '').trim();
        if (
          rowPhone === searchPhone &&
          (rowTimestamp === searchTimestamp || rowTimestamp.includes(searchTimestamp) || searchTimestamp.includes(rowTimestamp))
        ) {
          matchRowIndex = i + 1;
          break;
        }
      }

      if (matchRowIndex === -1) {
        // Fallback: match latest row with the same phone
        for (let i = rows.length - 1; i >= 1; i--) {
          const row = rows[i];
          const rowPhone = (row[2] || '').trim();
          if (rowPhone === searchPhone) {
            matchRowIndex = i + 1;
            break;
          }
        }
      }

      if (matchRowIndex === -1) {
        console.warn('Update price: no matching row found in sheet for', { searchPhone, searchTimestamp });
        return res.status(200).json({ status: 'not_found', message: 'Order row not found.' });
      }

      // Column J is the 10th column (Total Estimated Price)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${targetTab}!J${matchRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[newPrice]] },
      });

      return res.status(200).json({ status: 'success', data: { message: `Order price updated to ${newPrice} at row ${matchRowIndex}.` } });
    } else if (type === 'update_appointment_status') {
      const normalizeSlot = (s) => (s || '').replace(/^0/, '').trim().toUpperCase();
      const searchPhone = (data.patient_phone || '').trim();
      const searchDate  = (data.appointment_date || '').trim();
      const searchSlot  = normalizeSlot(data.time_slot);
      const newStatus   = (data.status || 'Pending').trim();

      targetTab = getMonthTabName(data.appointment_date);

      if (!sheetTitles.includes(targetTab)) {
        return res.status(200).json({ status: 'not_found', message: `Sheet tab ${targetTab} does not exist.` });
      }

      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${targetTab}!A:F`,
      });

      const rows = readRes.data.values || [];
      let matchRowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowPhone = (row[2] || '').trim();
        const rowDate  = (row[3] || '').trim();
        const rowSlot  = normalizeSlot(row[4]);
        if (
          rowPhone === searchPhone &&
          rowDate  === searchDate  &&
          rowSlot  === searchSlot
        ) {
          matchRowIndex = i + 1;
          break;
        }
      }

      if (matchRowIndex === -1) {
        console.warn('Update Apt Status: no matching row found in sheet for', { searchPhone, searchDate, searchSlot });
        return res.status(200).json({ status: 'not_found', message: 'Row not found.' });
      }

      // Column F is the 6th column (Status)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${targetTab}!F${matchRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[newStatus]] },
      });

      return res.status(200).json({ status: 'success', data: { message: `Appointment status updated to ${newStatus} at row ${matchRowIndex}.` } });
    } else {
      return res.status(400).json({ message: 'Invalid payload type' });
    }

    // If tab doesn't exist, create it and write headers first
    if (!sheetTitles.includes(targetTab)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: targetTab,
                },
              },
            },
          ],
        },
      });

      // Write headers to the new tab
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${targetTab}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // Append data to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'RAW',
      requestBody: {
        values: values,
      },
    });

    return res.status(200).json({ status: 'success', data: response.data });
  } catch (error) {
    console.error('❌ Error updating Google Sheets:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
