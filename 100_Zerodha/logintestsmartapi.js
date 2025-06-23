const axios = require("axios");
const { totp } = require("otplib");

const TOTP_SECRET = "CC3SDMVGWGKPF2NXLALOPN2RJQ";

const token = totp.generate(TOTP_SECRET);

console.log("Generated TOTP:", token);
const data = JSON.stringify({
  clientcode: "AAAO224601",
  password: "Singh@977al",
  totp: token,
  state: "",
});

const config = {
  method: "post",
  url: "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": "10.109.193.177",
    "X-ClientPublicIP": "119.82.125.154",
    "X-MACAddress": "38-22-E2-BD-46-5A",
    "X-PrivateKey": "3rmBFBxx",
  },
  data: data,
};

axios(config)
  .then(function (response) {
    console.log(data);
    console.log(JSON.stringify(response.data, null, 2));
  })
  .catch(function (error) {
    console.error(
      "Login failed:",
      error.response ? error.response.data : error.message
    );
  });
