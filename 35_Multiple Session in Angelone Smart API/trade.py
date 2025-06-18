from smartapi import SmartConnect
import login as l  # Use 'l', not '1' which is invalid in Python
import pyotp
import json

# Create SmartConnect object
obj = SmartConnect(api_key=l.api_key)

# Generate TOTP
token = pyotp.TOTP(l.totp).now()

# Generate session
data = obj.generateSession(l.user_id, l.password, token)

# Get feed token and tokens
feed_token = obj.getfeedToken()
access_token = data["data"]["jwtToken"]
refresh_token = data["data"]["refreshToken"]

# Print tokens
print("Feed Token is: {0}".format(feed_token))
print("Access Token is: {0}".format(access_token))
print("Refresh Token is: {0}".format(refresh_token))

# Save to JSON file
AllData = {
    "access_token": access_token,
    "refresh_token": refresh_token,
    "feed_token": feed_token,
}

with open("cred.json", "w") as jsonfile:
    json.dump(AllData, jsonfile, indent=4)
