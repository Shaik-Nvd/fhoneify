import os
import json
import time
import requests
from duckduckgo_search import DDGS

# Read models from seed_devices.ts
with open('server/seed_devices.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re
regex = r'"brand":\s*"Samsung",\s*"model":\s*"([^"]+)"'
models = list(set(re.findall(regex, content)))
models.sort()

output_dir = 'public/images/models'
os.makedirs(output_dir, exist_ok=True)

# Test with first 3 models
test_models = models[:3]

with DDGS() as ddgs:
    for model in test_models:
        filename = re.sub(r'[^a-z0-9]+', '-', model.lower()) + '.png'
        filepath = os.path.join(output_dir, filename)
        
        query = f"{model} smartphone png transparent"
        print(f"Searching for: {query}")
        
        try:
            results = ddgs.images(
                keywords=query,
                max_results=5
            )
            
            downloaded = False
            for res in results:
                image_url = res.get('image')
                if not image_url: continue
                
                if image_url.lower().endswith('.png'):
                    print(f"  Downloading: {image_url}")
                    try:
                        img_data = requests.get(image_url, timeout=5).content
                        with open(filepath, 'wb') as img_file:
                            img_file.write(img_data)
                        downloaded = True
                        print(f"  Success: {filename}")
                        break
                    except Exception as e:
                        print(f"  Failed to download: {e}")
            
            if not downloaded:
                print(f"  No suitable PNG found for {model}")
                
        except Exception as e:
            print(f"  Search failed: {e}")
            
        time.sleep(1) # Be nice to the API
