import urllib.request
import json
import re

url = "https://www.cashify.in/sell-old-mobile-phone/sell-apple-iphone-14"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
}

import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        html = response.read().decode('utf-8')
        print(f"Successfully fetched {url}, size: {len(html)} bytes")
        
        # Look for nextjs data or brand list
        if 'apple' in html.lower():
            print("Found 'apple' in HTML")
            
        with open('cashify_dump.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Dumped to cashify_dump.html")
            
except Exception as e:
    print(f"Error: {e}")
