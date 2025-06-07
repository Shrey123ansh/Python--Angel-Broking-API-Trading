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


# Historic API
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


# Bollinger Band function
def Bollinger_Band(DF, n, std):
    """Function to calculate Bollinger Bands"""
    df = DF.copy()
    df["MA"] = df["close"].rolling(n).mean()
    df["STD"] = df["close"].rolling(n).std()
    df["BB_up"] = df["MA"] + std * df["STD"]
    df["BB_dn"] = df["MA"] - std * df["STD"]
    df["BB_width"] = df["BB_up"] - df["BB_dn"]
    df.dropna(inplace=True)
    return df


# Example usage
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "ONE_DAY", "2021-05-03 00:00", "2021-06-07 15:30"
)
if not minute5data.empty:
    Band = Bollinger_Band(minute5data, 20, 2)
    print(Band)
else:
    print("Historical data fetch failed.")
