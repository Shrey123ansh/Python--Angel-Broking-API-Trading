import pandas as pd
import requests
from SmartApi import SmartConnect
import login as l
import datetime

# Global token_df
token_df = pd.DataFrame()


def initializeSymbolTokenMap():
    global token_df
    url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    d = requests.get(url).json()
    token_df = pd.DataFrame.from_dict(d)
    token_df["expiry"] = pd.to_datetime(token_df["expiry"], errors="coerce")
    token_df = token_df.astype({"strike": float}, errors="ignore")
    print("Token map initialized")


def getTokenInfo(exch_seg, instrumenttype, symbol, strike_price, pe_ce):
    df = l.token_map  # assuming token_map is a preloaded DataFrame from login module

    strike_price = int(strike_price * 100)  # convert to paise (float * 100 → int)

    if exch_seg == "NSE" and instrumenttype == "EQ":
        eq_df = df[(df["exch_seg"] == "NSE") & (df["instrumenttype"] == "EQ")]
        return eq_df[eq_df["symbol"] == symbol]  # Empty DataFrame if no match


# ----------- Main Execution Flow -------------
# Login and session creation
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Fetch feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken

# Fetch user profile
userProfile = obj.getProfile(refreshToken)
print("Login successful for:", userProfile["data"]["name"])

# Initialize token data
initializeSymbolTokenMap()

# Example: Get BANKNIFTY token (You can modify as needed)
nifty_token = getTokenInfo("NSE", "OPTIDX", "BANKNIFTY", 0, "").iloc[0]["token"]
print("BANKNIFTY Token:", nifty_token)

# Fetch LTP
ltp = obj.ltpData("NSE", "BANKNIFTY", nifty_token)
print("LTP Data:", ltp)

Ltp = ltp["data"]["ltp"]
print("Live Price:", Ltp)
