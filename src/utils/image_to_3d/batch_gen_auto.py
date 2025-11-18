import requests
import base64
import os
import zipfile
from concurrent.futures import ThreadPoolExecutor
import requests, base64

API_URL = "http://127.0.0.1:7860/sdapi/v1/img2img"
REFERENCE_IMAGE = "RoachSample.png"


with open(REFERENCE_IMAGE, "rb") as f:
    img_base64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "prompt": "test image",
    "init_images": [img_base64],
    "steps": 20,
    "width": 512,
    "height": 512
}

response = requests.post(API_URL, json=payload)
print(response.status_code)
print(response.text[:500])  # Preview response


try:
    response = requests.get(API_URL)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)


OUTPUT_DIR = "generated_images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

prompts = [
    "A photorealistic image of a brown low-poly cockroach, front view, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, front-left view at 45 degrees, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, left side view, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, back-left view at 45 degrees, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, back view, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, back-right view at 45 degrees, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, right side view, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, front-right view at 45 degrees, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, top-down view, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, bottom-up view, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, close-up of head and antennae, consistent lighting, same polygonal style, high detail, sharp focus, studio background",
    "A photorealistic image of a brown low-poly cockroach, close-up of legs and body texture, consistent lighting, same polygonal style, high detail, sharp focus, studio background"
]

params = {
    "steps": 30,
    "sampler_name": "DPM++ 2M Karras",
    "cfg_scale": 7,
    "width": 768,
    "height": 768,
    "seed": 1220520759,
    "denoising_strength": 0.5
}

with open(REFERENCE_IMAGE, "rb") as img_file:
    img_base64 = base64.b64encode(img_file.read()).decode("utf-8")

def generate_image(idx, prompt):
    payload = params.copy()
    payload.update({
        "prompt": prompt,
        "init_images": [img_base64]
    })

    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 200:
            r = response.json()
            image_base64 = r["images"][0]
            image_data = base64.b64decode(image_base64)
            image_path = os.path.join(OUTPUT_DIR, f"cockroach_angle_{idx}.png")
            with open(image_path, "wb") as f:
                f.write(image_data)
            print(f"✅ Saved: {image_path}")
            return image_path
        else:
            print(f"❌ Failed for {idx}: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error for {idx}: {e}")
        return None

image_paths = []
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(generate_image, idx, prompt) for idx, prompt in enumerate(prompts, start=1)]
    for future in futures:
        result = future.result()
        if result:
            image_paths.append(result)

zip_path = "cockroach_angles.zip"
with zipfile.ZipFile(zip_path, "w") as zipf:
    for img_path in image_paths:
        zipf.write(img_path, os.path.basename(img_path))

print(f"✅ Batch generation complete. ZIP file created: {zip_path}")