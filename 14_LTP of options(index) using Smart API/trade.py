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


def getTokenInfo(exch_seg, instrumenttype, symbol, strike_price, pe_ce):
    # Load the instrument data if not already available globally
    # Example: df = pd.read_csv("instruments.csv") or keep it as a global DataFrame
    global df

    if exch_seg == "NFO" :
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
        ]
    elif exch_seg == "NFO" and instrumenttype == "FUTIDX":
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
        ]
    elif exch_seg == "NFO" and instrumenttype in ["OPTSTK", "OPTIDX"]:
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
            & (df["strike_price"] == float(strike_price))
            & (df["option_type"] == pe_ce)
        ]
    else:
        return pd.DataFrame()  # return empty DataFrame if no match


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


def initializeSymbolTokenMap():
    f_token = getTokenInfo("NFO", "OPTIDX", "BANKNIFTY", 15800, "PE").iloc[0]
    print(f_token)

    symbol = f_token["symbol"]
    token = f_token["token"]
    lot = f_token["lotsize"]

    ltp = obj.ltpData("NFO", symbol, token)
    print(ltp)

    Ltp = ltp["data"]["ltp"]
    print(Ltp)


# //Note: need to complete the code
