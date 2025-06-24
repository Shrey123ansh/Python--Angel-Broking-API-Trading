import pandas as pd
import requests
from SmartApi import SmartConnect
import login as l
import datetime
import math

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
    token_df = token_df.astype({"strike": float}, errors="ignore")
    print("Token map initialized")


def OHLCHistory(symbol, token, interval, fdate, todate):
    try:
        historicParam = {
            "exchange": "NSE",
            "tradingsymbol": symbol,
            "symboltoken": token,
            "interval": interval,
            "fromdate": fdate,
            "todate": todate,
        }
        history = obj.getCandleData(historicParam)["data"]
        df = pd.DataFrame(history)
        df = df.rename(
            columns={
                0: "Datetime",
                1: "open",
                2: "high",
                3: "low",
                4: "close",
                5: "volume",
            }
        )
        df["Datetime"] = pd.to_datetime(df["Datetime"])
        df.set_index("Datetime", inplace=True)
        return df
    except Exception as e:
        print("Historic API failed:", e)
        return pd.DataFrame()

 
def getTokenInfo(symbol, exch_seg="NSE"):
    df = l.token_map  # Assuming token_map is already initialized and loaded

    print("Full Token Map DataFrame:")
    print(df.head())  # Use .head() to avoid flooding the output

    if exch_seg == "NSE":
        # Filter only equity segment rows where instrument type is EQ
        eq_df = df[(df["exch_seg"] == "NSE") & (df["symbol"].str.contains("EQ"))]

        print("Filtered Equity DataFrame:")
        print(eq_df[eq_df["name"] == symbol])  # Show matched rows before return

        return eq_df[eq_df["name"] == symbol]


# Sample usage
print("Start:")
stocks = ["SBIN", "SRF", "KTKBANK"]
DailyData = {}


def initializeSymbolTokenMap():
    for ticker in stocks:
        # Fetch token and symbol for the given ticker
        tokenDetails = getTokenInfo(ticker, "NSE").iloc[0]
        symbol = tokenDetails["symbol"]
        token = tokenDetails["token"]

        # Fetch daily OHLC data and store in dictionary
        DailyData[ticker] = OHLCHistory(
            str(symbol), str(token), "ONE_DAY", "2021-02-08 00:00", "2021-06-05 00:00"
        )


print("End of Algo")
# return empty DataFrame if no match
