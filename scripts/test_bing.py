import requests
import re
import urllib3
urllib3.disable_warnings()

api_key = '1d97a729531d23ad8a2ae00633d3861b'
query = 'SAMSUNG GALAXY A14 5G smartphone png transparent'
bing_url = f"https://www.bing.com/images/search?q={requests.utils.quote(query)}"

url = f"http://api.scraperapi.com/"
params = {
    "api_key": api_key,
    "url": bing_url
}

print(f"Requesting: {bing_url}")
response = requests.get(url, params=params, verify=False, timeout=30)
if response.status_code == 200:
    html = response.text
    # Extract murl using regex
    murls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', html)
    print(f"Found {len(murls)} images.")
    for m in murls[:3]:
        print(m)
else:
    print("Failed structured search:", response.status_code, response.text)
