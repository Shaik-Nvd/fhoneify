import os
import re
import requests
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
import urllib3
urllib3.disable_warnings()

api_key = '1d97a729531d23ad8a2ae00633d3861b'

def download_image(model):
    filename = re.sub(r'[^a-z0-9]+', '-', model.lower()) + '.png'
    filepath = os.path.join('public/images/models', filename)
    
    query = f"{model} smartphone png transparent"
    bing_url = f"https://www.bing.com/images/search?q={urllib.parse.quote(query)}"
    
    try:
        r = requests.get(f"http://api.scraperapi.com/", params={"api_key": api_key, "url": bing_url}, timeout=30, verify=False)
        if r.status_code == 200:
            urls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', r.text)
            
            best_urls = [u for u in urls if '.png' in u.lower()]
            if not best_urls:
                best_urls = urls[:5]
                
            for img_url in best_urls:
                try:
                    img_data = requests.get(img_url, timeout=10, verify=False).content
                    if len(img_data) > 5000:
                        with open(filepath, 'wb') as f:
                            f.write(img_data)
                        print(f"Success: {model}")
                        return
                except:
                    pass
        print(f"Failed to find image for: {model}")
    except Exception as e:
        print(f"Error {model}: {e}")

if __name__ == '__main__':
    with open('server/seed_devices.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    models = list(set(re.findall(r'"brand":\s*"Samsung",\s*"model":\s*"([^"]+)"', content)))
    models.sort()
    print(f"Downloading {len(models)} images...")
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(download_image, models)
