const { SmartAPI } = require("smartapi-javascript");
const { totp } = require("otplib");
const login = require("./login"); // contains api_key, client_code, password, and totp_secret

async function loginToSmartAPI() {
  try {
    // Generate TOTP using otplib
    const token = totp.generate(login.totp_secret);

    const smartApi = new SmartAPI({
      api_key: login.api_key,
    });

    const session = await smartApi.generateSession(
      login.client_code,
      login.password,
      token
    );

    const refreshToken = session.data.refreshToken;
    console.log("Refresh Token:", refreshToken);

    const feedToken = await smartApi.getFeedToken();
    login.feed_token = feedToken;
    console.log("Feed Token:", feedToken);

    return {
      refreshToken,
      feedToken,
    };
  } catch (error) {
    console.error("❌ Login failed:", error.message || error);
    return null;
  }
}

// Call the function
loginToSmartAPI();
