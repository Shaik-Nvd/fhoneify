import requests
import urllib3
urllib3.disable_warnings()

api_key = '1d97a729531d23ad8a2ae00633d3861b'
search_query = 'SAMSUNG GALAXY A14 5G smartphone png transparent'

url = f"https://api.scraperapi.com/structured/google/search"
params = {
    "api_key": api_key,
    "query": search_query,
    "search_type": "image"
}

response = requests.get(url, params=params, verify=False)
if response.status_code == 200:
    data = response.json()
    images = data.get('images', [])
    for img in images[:3]:
        print(img.get('link') or img.get('image'))
    if not images:
        print("No images found in response:", list(data.keys()))
else:
    print("Failed structured search:", response.status_code, response.text)
