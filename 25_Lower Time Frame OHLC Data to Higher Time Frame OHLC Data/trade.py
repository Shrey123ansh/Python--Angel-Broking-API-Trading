import pandas as pd
from datetime import datetime, time

# Load the 3-min OHLC data
ohlc = pd.read_csv("NIFTY BANK_3min.csv")

# Convert 'date' to datetime format
ohlc["date"] = pd.to_datetime(ohlc["date"])

# Filter between 9:15 AM and 3:30 PM
ohlc = ohlc[
    (ohlc["date"].dt.time > time(9, 14)) & (ohlc["date"].dt.time < time(15, 30))
]

# Create a 'day' column for grouping
ohlc["day"] = ohlc["date"].dt.date

# Set datetime index for resampling
ohlc.set_index("date", inplace=True)

# Group by each day
gpohlc = ohlc.groupby("day")

# List to collect resampled DataFrames
dfList = []

# Resample each day's data into 15-minute intervals
for k, res in gpohlc:
    reohlc = res.resample("15T").agg(
        {
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum" if "volume" in res.columns else "first",  # Optional
        }
    )
    reohlc.reset_index(inplace=True)
    dfList.append(reohlc)

# Concatenate all resampled days into one DataFrame
resohlcfinal = pd.concat(dfList, ignore_index=True)

# Save to CSV
resohlcfinal.to_csv("nf15.csv", index=False)

# Optional: Print preview
print(resohlcfinal.head())
