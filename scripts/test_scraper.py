import os
import requests
from duckduckgo_search import DDGS

api_key = '1d97a729531d23ad8a2ae00633d3861b'
proxy_url = f"http://scraperapi:{api_key}@proxy-server.scraperapi.com:8001"
proxies = proxy_url

try:
    with DDGS(proxy=proxies) as ddgs:
        results = ddgs.images("SAMSUNG GALAXY A14 5G smartphone png transparent", max_results=2)
        print(results)
except Exception as e:
    print("Failed with proxy kwarg:", e)
    
try:
    with DDGS(proxies=proxies) as ddgs:
        results = ddgs.images("SAMSUNG GALAXY A14 5G smartphone png transparent", max_results=2)
        print(results)
except Exception as e:
    print("Failed with proxies kwarg:", e)
