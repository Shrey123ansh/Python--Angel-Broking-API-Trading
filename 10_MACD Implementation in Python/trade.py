# Package imports
from smartapi.smartConnect import SmartConnect
import pandas as pd
import login as l  # Make sure this file contains: api_key, user_name, password
import requests

# Step 1: Login
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]
feedToken = obj.getfeedToken()
l.feed_token = feedToken

print("Feed Token:", feedToken)

userProfile = obj.getProfile(refreshToken)
print("User Profile:", userProfile)


# Step 2: OHLC History Fetch Function
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
        history = pd.DataFrame(history)
        history = history.rename(
            columns={
                0: "Datetime",
                1: "open",
                2: "high",
                3: "low",
                4: "close",
                5: "Volume",
            }
        )
        history["Datetime"] = pd.to_datetime(history["Datetime"])
        history = history.set_index("Datetime")
        return history

    except Exception as e:
        print("API failed: {}".format(e))
        return pd.DataFrame()


# Step 3: MACD Function
def MACD(DF, len1, len2, len3):
    """
    Function to calculate MACD
    len1 = Fast EMA (typically 12)
    len2 = Slow EMA (typically 26)
    len3 = Signal EMA (typically 9)
    """
    df = DF.copy()
    df["MA_Fast"] = df["close"].ewm(span=len1, min_periods=len1).mean()
    df["MA_Slow"] = df["close"].ewm(span=len2, min_periods=len2).mean()
    df["MACD"] = df["MA_Fast"] - df["MA_Slow"]
    df["Signal"] = df["MACD"].ewm(span=len3, min_periods=len3).mean()
    df.dropna(inplace=True)
    return df


# Step 4: Call functions
minute5data = OHLCHistory(
    "SAIN-FO", "3845", "FIVE_MINUTE", "2021-01-03 00:00", "2021-06-07 15:31"
)

if not minute5data.empty:
    MACDdata = MACD(minute5data, 12, 26, 9)
    print(MACDdata)
else:
    print("No data returned from OHLCHistory.")
