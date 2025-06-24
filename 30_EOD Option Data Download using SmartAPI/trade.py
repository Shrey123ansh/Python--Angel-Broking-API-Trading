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


def getCandleData(symbolInfo):
    try:
        historicParam = {
            "exchange": symbolInfo.exch_seg,
            "symboltoken": symbolInfo.token,
            "interval": "ONE_MINUTE",
            "fromdate": f"{date.today() - timedelta(1)} 09:15",
            "todate": f"{date.today() - timedelta(1)} 15:30",
        }

        res_json = obj.getCandleData(historicParam)
        columns = ["timestamp", "open", "high", "low", "close", "volume"]
        df = pd.DataFrame(res_json["data"], columns=columns)
        df["timestamp"] = pd.to_datetime(df["timestamp"], format="%Y-%m-%dT%H:%M:%S")
        df["symbol"] = symbolInfo.symbol
        df["expiry"] = symbolInfo.expiry

        print(f"Done for {symbolInfo.symbol}")
        tt.sleep(0.2)
        return df

    except Exception as e:
        print(f"Historic API failed for {symbolInfo.symbol}: {e}")
        return pd.DataFrame()


# ========== Main Logic ==========
symbol = "NIFTY"

# Filter token_df for NIFTY FUT and OPT
fut = token_df[
    (token_df.exch_seg == "NFO")
    & (token_df.instrumenttype == "FUTIDX")
    & (token_df.name == symbol)
]

fno = token_df[
    (token_df.exch_seg == "NFO")
    & (token_df.name == symbol)
    & (token_df.instrumenttype == "OPTIDX")
]

# ---------- Monthly Expiry ----------
currentExpiry = sorted(fut.expiry.tolist())
MonthExpiry = currentExpiry[0]
MonthSymbolDf = fno[fno.expiry == MonthExpiry].reset_index(drop=True)

optMdfList = []
for i in MonthSymbolDf.index:
    try:
        optsymbol = MonthSymbolDf.loc[i]
        candleRes = getCandleData(optsymbol)
        optMdfList.append(candleRes)
    except Exception as e:
        print(f"Fetching Monthly Hist Data failed for {optsymbol.symbol}: {e}")

optMFinalDf = pd.concat(optMdfList, ignore_index=True)
optMFinalDf.to_csv(f"{date.today()}_MonthData.csv", index=False)
print("✅ End of Monthly")

# ---------- Weekly Expiry ----------
currentExpiry = sorted(fno.expiry.tolist())
if len(currentExpiry) > 1:
    WeeklyExpiry = currentExpiry[1]
else:
    WeeklyExpiry = currentExpiry[0]  # fallback

print(f"Weekly Expiry: {WeeklyExpiry}")
WeekSymbolDf = fno[fno.expiry == WeeklyExpiry].reset_index(drop=True)

optWdfList = []
for i in WeekSymbolDf.index:
    try:
        optsymbol = WeekSymbolDf.loc[i]
        candleRes = getCandleData(optsymbol)
        optWdfList.append(candleRes)
    except Exception as e:
        print(f"Fetching Weekly Hist Data failed for {optsymbol.symbol}: {e}")

optWFinalDf = pd.concat(optWdfList, ignore_index=True)
optWFinalDf.to_csv(f"{date.today()}_WeekData.csv", index=False)
print("✅ End of Weekly")
