import os
import time
import requests
from duckduckgo_search import DDGS

try:
    with DDGS() as ddgs:
        results = ddgs.images("SAMSUNG GALAXY A14 5G smartphone transparent png", max_results=2)
        print(results)
except Exception as e:
    print("Failed:", e)
