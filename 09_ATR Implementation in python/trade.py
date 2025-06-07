from smartapi.smartConnect import SmartConnect
import pandas as pd
import login as l  # Contains your credentials like api_key, user_name, password

# Step 1: Login
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Step 2: Fetch feed token and user profile
feedToken = obj.getfeedToken()
l.feed_token = feedToken
print("Feed Token:", feedToken)

userProfile = obj.getProfile(refreshToken)
print("User Profile:", userProfile)


# Step 3: Historic OHLC Data
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
                5: "volume",
            }
        )
        history["Datetime"] = pd.to_datetime(history["Datetime"])
        history = history.set_index("Datetime")
        return history

    except Exception as e:
        print("Historic API failed:", e)
        return pd.DataFrame()


# Step 4: ATR Function
def ATR(df, n):
    df = df.copy()
    df["H-L"] = abs(df["high"] - df["low"])
    df["H-PC"] = abs(df["high"] - df["close"].shift(1))
    df["L-PC"] = abs(df["low"] - df["close"].shift(1))
    df["TR"] = df[["H-L", "H-PC", "L-PC"]].max(axis=1, skipna=False)
    df["ATR"] = df["TR"].ewm(span=n, adjust=False, min_periods=n).mean()
    df = df.drop(["H-L", "H-PC", "L-PC", "TR"], axis=1)
    return df


# Step 5: Run
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-02-03 00:00", "2021-06-07 15:30"
)

if not minute5data.empty:
    AtrValue = ATR(minute5data, 14)
    print(AtrValue.tail())
else:
    print("No historical data available.")
