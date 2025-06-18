from smartapi import SmartConnect
import time as tt
import requests
import pandas as pd
import login as l
from datetime import datetime

# Ensure all columns are visible during debugging
pd.set_option("max_columns", None)


def intializeSymbolTokenMap():
    url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    d = requests.get(url).json()

    global token_df
    token_df = pd.DataFrame.from_dict(d)
    token_df["expiry"] = pd.to_datetime(token_df["expiry"], errors="coerce")
    token_df = token_df.astype({"strike": float})
    l.token_map = token_df


# Create SmartConnect session
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Fetch feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken

# Load instrument data
intializeSymbolTokenMap()

# Pick the symbol you want to track
symbol = "NIFTY"

# Get futures data for the symbol
fut = token_df[
    (token_df["exch_seg"] == "NFO")
    & (token_df["instrumenttype"] == "FUTIDX")
    & (token_df["name"] == symbol)
]

# Extract and sort unique expiry dates
currentExpiry = fut["expiry"].dropna().unique().tolist()
currentExpiry.sort()

# Get Monthly Expiry
MonthExpiry = pd.to_datetime(currentExpiry[0], utc=True)
MonthExpiry = MonthExpiry.tz_convert("Asia/Kolkata")
print("Monthly Expiry:", MonthExpiry)

# Get all FNO data for the symbol
fno = token_df[(token_df["exch_seg"] == "NFO") & (token_df["name"] == symbol)]

# Extract and sort expiry dates again
currentExpiry = fno["expiry"].dropna().unique().tolist()
currentExpiry.sort()

# Get Weekly Expiry
WeeklyExpiry = pd.to_datetime(currentExpiry[0], utc=True)
WeeklyExpiry = WeeklyExpiry.tz_convert("Asia/Kolkata")
print("Weekly Expiry:", WeeklyExpiry)
