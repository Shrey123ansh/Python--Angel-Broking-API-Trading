const { KiteConnect } = require("kiteconnect");

const API_KEY = "vcaa0y84pydefqc5";
const API_SECRET = "s9eonqaq7m3dw7ij7a3280iadtmt86nz";
const REQUEST_TOKEN = "http://localhost:3000/";

const kc = new KiteConnect({ api_key: API_KEY });

kc.generateSession(REQUEST_TOKEN, { api_secret: API_SECRET })
  .then((session) => {
    console.log("✅ Access Token:", session.access_token);

    return kc.getLTP(["NSE:INFY", "BSE:SENSEX", "NSE:NIFTY 50"]);
  })
  .then((data) => {
    console.log("LTP:", data);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message || err);
  });
