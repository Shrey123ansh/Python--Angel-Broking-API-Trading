from smartapi.smartConnect import SmartConnect
import pandas as pd
import login as l  # assuming 'login.py' has 'api_key', 'user_name', 'password'

# Initialize connection
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]
feedToken = obj.getfeedToken()
l.feed_token = feedToken

print("Feed Token:", feedToken)

# Fetch user profile
userProfile = obj.getProfile(refreshToken)
print("User Profile:", userProfile)


# Historical OHLC data fetcher
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
        data = obj.getCandleData(historicParam)["data"]
        df = pd.DataFrame(data)
        df = df.rename(
            columns={
                0: "Datetime",
                1: "open",
                2: "high",
                3: "low",
                4: "close",
                5: "Volume",
            }
        )
        df["Datetime"] = pd.to_datetime(df["Datetime"])
        df.set_index("Datetime", inplace=True)
        return df
    except Exception as e:
        print("API failed: {}".format(e))
        return pd.DataFrame()


# Moving average calculation
def moving_average(df, len1, len2):
    df = df.copy()
    df["MA_Simple"] = df["close"].rolling(window=len1).mean()
    df["MA_Exponential"] = df["close"].ewm(span=len2, min_periods=len2).mean()
    return df


# Fetch 5-min OHLC data
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-06-03 00:00", "2021-06-07 15:38"
)

# Apply moving averages
if not minute5data.empty:
    ma_df = moving_average(minute5data, 8, 10)
    print(ma_df.tail())
else:
    print("No data received from API.")
