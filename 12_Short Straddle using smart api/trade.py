from smartapi.smartConnect import SmartConnect
import pandas as pd
import requests
import login as l
import datetime
import math

# Initialize the SmartConnect object
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Fetch the feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken

# Fetch user profile
userProfile = obj.getProfile(refreshToken)

# Global token map
token_df = pd.DataFrame()


def initializeSymbolTokenMap():
    global token_df
    url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    d = requests.get(url).json()
    token_df = pd.DataFrame.from_dict(d)
    token_df["expiry"] = pd.to_datetime(token_df["expiry"], errors="coerce")
    token_df["strike"] = pd.to_numeric(token_df["strike"], errors="coerce")
    print("Symbol Token Map Initialized")


def getTokenInfo(exch_seg, instrumenttype, symbol, strike_price=None, pe_ce=None):
    df = token_df.copy()
    if exch_seg == "NSE":
        return df[(df["exch_seg"] == "NSE") & (df["symbol"] == symbol)]
    elif exch_seg == "NFO":
        strike_price = strike_price * 100 if strike_price is not None else None
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
            & ((df["strike"] == strike_price) if strike_price is not None else True)
            & ((df["optiontype"] == pe_ce) if pe_ce is not None else True)
        ]
    else:
        return pd.DataFrame()


def place_order(token, symbol, qty, exch_seg, buy_sell, ordertype, price):
    try:
        orderparams = {
            "variety": "NORMAL",
            "tradingsymbol": symbol,
            "symboltoken": token,
            "transactiontype": buy_sell,
            "exchange": exch_seg,
            "ordertype": ordertype,
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": price,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": qty,
        }
        orderId = obj.placeOrder(orderparams)
        print("The order ID is: {}".format(orderId))
    except Exception as e:
        print("Order placement failed: {}".format(e))


# Run logic
initializeSymbolTokenMap()

# Get BANKNIFTY LTP and round to nearest 100
nifty_token_info = getTokenInfo("NSE", "EQ", "BANKNIFTY")
if not nifty_token_info.empty:
    nifty_token = nifty_token_info.iloc[0]["token"]
    ltp_data = obj.ltpData("NSE", "BANKNIFTY", nifty_token)
    ltp = float(ltp_data["data"]["ltp"])
    rtm = int(round(ltp / 100) * 100)
    print("BANKNIFTY LTP:", ltp, "Rounded to:", rtm)

    # Get CE and PE option info
    ce_info = getTokenInfo("NFO", "OPTIDX", "BANKNIFTY", rtm, "CE")
    pe_info = getTokenInfo("NFO", "OPTIDX", "BANKNIFTY", rtm, "PE")

    if not ce_info.empty and not pe_info.empty:
        ce_symbol = ce_info.iloc[0]
        pe_symbol = pe_info.iloc[0]

        print("Placing CE order for:", ce_symbol["tradingsymbol"])
        place_order(
            ce_symbol["token"],
            ce_symbol["tradingsymbol"],
            int(ce_symbol["lotsize"]),
            "NFO",
            "SELL",
            "MARKET",
            0,
        )

        print("Placing PE order for:", pe_symbol["tradingsymbol"])
        place_order(
            pe_symbol["token"],
            pe_symbol["tradingsymbol"],
            int(pe_symbol["lotsize"]),
            "NFO",
            "SELL",
            "MARKET",
            0,
        )
    else:
        print("CE or PE option data not found for BANKNIFTY", rtm)
else:
    print("BANKNIFTY token not found.")
