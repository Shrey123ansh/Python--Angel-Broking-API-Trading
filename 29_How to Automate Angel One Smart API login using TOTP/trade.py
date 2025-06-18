from smartapi import SmartConnect
import time as tt
import requests
import pandas as pd
import login as l
import pyotp
from datetime import datetime, date, time
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Initialize SmartConnect with API key
obj = SmartConnect(api_key=l.api_key)

# Generate TOTP token
token = pyotp.TOTP(l.totp).now()

# Generate session using credentials and TOTP token
data = obj.generateSession(l.user_name, l.password, token)

# Extract refreshToken safely
refreshToken = data["data"]["refreshToken"]
print("Refresh Token: " + refreshToken)

# Fetch the feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken
print("Feed Token: " + feedToken)
