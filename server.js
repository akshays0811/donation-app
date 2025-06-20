require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const Twilio = require("twilio");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Twilio config
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheetId = process.env.GOOGLE_SHEET_ID;

async function appendToSheet(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:D",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[data.refName, data.donorName, data.mobile, data.amount]],
    },
  });
}

app.post("/handle-donation", async (req, res) => {
  const { refName, donorName, mobile, amount } = req.body;

  try {
    await appendToSheet({ refName, donorName, mobile, amount });

    await twilioClient.messages.create({
      body: `Thank you ${donorName} for your donation of ₹${amount}! 🙏`,
      from: process.env.TWILIO_FROM,
      to: `+91${mobile}`,
    });

    res.status(200).json({ success: true, message: "Logged and SMS sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});