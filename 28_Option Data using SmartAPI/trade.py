import datetime
import time
import pandas as pd
import requests
import math
import schedule
from SmartApi import SmartConnect  # Ensure SmartApi is installed and imported correctly
import login as l  # Your login.py should contain api_key, user_name, password
from your_module import (
    intalizeSymbolTokenMap,
    orderbookstatus,
)  # Replace with your actual function/module
from datetime import datetime, date, timedelta

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


def getTokenInfo(symbol,instrumenttype, exch_seg="NSE",symbol, strike_price, pe_ce):
    global token_df
    df = token_df.copy()
    strike_price = strike_price * 100  # Convert to correct strike format if needed

    if exch_seg == "NFO" and instrumenttype in ["OPTSTK", "OPTIDX"]:
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
            & (df["strike_price"] == float(strike_price))
            & (df["option_type"] == pe_ce)
        ]
    
def getCandleData(symbolInfo):
    try:
        from_date = f"{(date.today() - timedelta(days=90)).strftime('%Y-%m-%d')} 09:15"
        to_date = f"{(date.today() - timedelta(days=1)).strftime('%Y-%m-%d')} 15:30"

        historicParam = {
            "exchange": symbolInfo.exch_seg,
            "symboltoken": symbolInfo.token,
            "interval": "FIVE_MINUTE",
            "fromdate": from_date,
            "todate": to_date
        }

        res_json = obj.getCanddleData(historicParam)

        columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        df = pd.DataFrame(res_json['data'], columns=columns)
        df['timestamp'] = pd.to_datetime(df['timestamp'], format='%Y-%m-%dT%H:%M:%S')
        df['symbol'] = symbolInfo.symbol
        df['expiry'] = symbolInfo.expiry

        print(f"✅ Done for {symbolInfo.symbol}")
        return df

    except Exception as e:
        print(f"❌ Historic API failed for {symbolInfo.symbol}: {e}")
        return pd.DataFrame()  # Return empty dataframe on failure

initializeSymbolTokenMap()
# Example usage
f_token = getTokenInfo("NFO", "OPTIDX", "NIFTY",17800, "CE").iloc[0]
print(f_token)
symbol = f_token["symbol"]
token = f_token["token"]
lot = f_token["lotsize"]
print(token, symbol, lot)

getCandleData(f_token)