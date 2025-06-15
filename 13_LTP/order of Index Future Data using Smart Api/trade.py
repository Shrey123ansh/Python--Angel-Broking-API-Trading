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


# //Note: need to complete the code
