import os
import io
import json
import base64
import logging
from typing import List, Dict, Any, Optional

import requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pdf2image import convert_from_bytes
from PIL import Image
from supabase import create_client, Client
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "hsk-assets")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

app = FastAPI(title="HSK Asset Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "hsk_asset_service"}

def convert_pdf_page_to_image(pdf_bytes: bytes, page_no: int, dpi: int = 200) -> Image.Image:
    """Converts a specific PDF page to a PIL Image."""
    logger.info(f"Rendering page {page_no}...")
    # pdf2image pages are 0-indexed internally, but user provides 1-indexed
    images = convert_from_bytes(
        pdf_bytes,
        first_page=page_no,
        last_page=page_no,
        dpi=dpi
    )
    if not images:
        raise ValueError(f"Could not render page {page_no}")
    return images[0]

def image_to_base64(image: Image.Image) -> str:
    """Converts a PIL Image to base64 string."""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def call_gemini_detect_boxes(image_b64: str, img_w: int, img_h: int, part_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Calls Gemini Vision API to detect bounding boxes for assets."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    prompt = f"""
Identify bounding boxes for question and option images on this HSK exam page.
Part: {part_metadata['part_key']}
Section: {part_metadata['section_type']}
Question Type: {part_metadata['question_type']}
Question Range: {part_metadata['question_from']} to {part_metadata['question_to']}

Requirements:
- Detect ONLY the relevant images for the questions/options.
- Exclude headers, page numbers, instructions, and text.
- Return pixel coordinates {{x, y, w, h}} relative to the input image.
- Image size is {img_w}x{img_h}.

Specific Rules:
- For 'listen_true_false_image' or 'read_true_false_image_word':
  - owner_type: "question", owner_ref: "question_no", asset_key: "q{{question_no}}_image"
- For 'listen_choose_picture':
  - owner_type: "option", owner_ref: "{{question_no}}_{{option_key}}", asset_key: "q{{question_no}}_{{option_key}}_image"
- For 'listen_match_picture' or 'read_match_picture':
  - owner_type: "group_option", owner_ref: "{{option_key}}", asset_key: "group_{{option_key}}_image"

Return a JSON object with an 'assets' array.
Example:
{{
  "assets": [
    {{
      "asset_key": "q1_image",
      "owner_type": "question",
      "owner_ref": "1",
      "bbox": {{ "x": 100, "y": 200, "w": 300, "h": 220 }},
      "asset_hint": "brief description of content"
    }}
  ]
}}
"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/png", "data": image_b64}}
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    response = requests.post(f"{GEMINI_API_URL}?key={GEMINI_API_KEY}", json=payload)
    
    if response.status_code != 200:
        logger.error(f"Gemini API error: {response.text}")
        raise HTTPException(status_code=502, detail="Gemini API failed")

    try:
        result = response.json()
        text_content = result['candidates'][0]['content']['parts'][0]['text']
        data = json.loads(text_content)
        return data.get("assets", [])
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        logger.error(f"Raw tail: {response.text[-500:]}")
        raise HTTPException(status_code=502, detail="Invalid response from Gemini")

def validate_detected_assets(assets: List[Dict[str, Any]], part_metadata: Dict[str, Any]) -> str:
    """Checks if detected count matches expected count."""
    q_from = part_metadata['question_from']
    q_to = part_metadata['question_to']
    q_count = q_to - q_from + 1
    q_type = part_metadata['question_type']

    expected = 0
    if q_type in ["listen_true_false_image", "read_true_false_image_word"]:
        expected = q_count
    elif q_type == "listen_choose_picture":
        expected = q_count * 3
    elif q_type in ["listen_match_picture", "read_match_picture"]:
        expected = 6

    if len(assets) != expected:
        logger.warning(f"Expected {expected} assets, got {len(assets)}")
        return "needs_review"
    return "pending"

def clamp_bbox(bbox: Dict[str, int], img_w: int, img_h: int, padding: int = 8) -> Optional[Dict[str, int]]:
    """Clamps and pads bounding box."""
    x, y, w, h = bbox['x'], bbox['y'], bbox['w'], bbox['h']
    
    x1 = max(0, min(x - padding, img_w - 1))
    y1 = max(0, min(y - padding, img_h - 1))
    x2 = max(0, min(x + w + padding, img_w))
    y2 = max(0, min(y + h + padding, img_h))

    new_w = x2 - x1
    new_h = y2 - y1

    if new_w < 5 or new_h < 5:
        return None

    return {"x": int(x1), "y": int(y1), "w": int(new_w), "h": int(new_h)}

def crop_asset(image: Image.Image, bbox: Dict[str, int]) -> bytes:
    """Crops an image and returns PNG bytes."""
    crop_box = (bbox['x'], bbox['y'], bbox['x'] + bbox['w'], bbox['y'] + bbox['h'])
    cropped = image.crop(crop_box)
    img_byte_arr = io.BytesIO()
    cropped.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

def upload_png_to_supabase(png_bytes: bytes, storage_path: str) -> str:
    """Uploads bytes to Supabase Storage and returns public URL."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Overwrite if exists
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=storage_path,
            file=png_bytes,
            file_options={"content-type": "image/png", "x-upsert": "true"}
        )
        # Get public URL
        res = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)
        return res
    except Exception as e:
        logger.error(f"Supabase upload error: {e}")
        raise HTTPException(status_code=500, detail="Supabase upload failed")

def build_storage_path(metadata: Dict[str, Any], asset_key: str) -> str:
    """Builds the standardized storage path."""
    return f"hsk/{metadata['hsk_level']}/{metadata['exam_set_id']}/{metadata['section_type']}/{metadata['part_key']}/{asset_key}.png"

@app.post("/detect-crop-upload")
async def detect_crop_upload(
    file: UploadFile = File(...),
    exam_set_id: str = Form(...),
    hsk_level: str = Form(...),
    page_no: int = Form(...),
    part_key: str = Form(...),
    section_type: str = Form(...),
    question_from: int = Form(...),
    question_to: int = Form(...),
    question_type: str = Form(...)
):
    logger.info(f"Received request for {exam_set_id}, page {page_no}")
    
    metadata = {
        "exam_set_id": exam_set_id,
        "hsk_level": hsk_level,
        "page_no": page_no,
        "part_key": part_key,
        "section_type": section_type,
        "question_from": question_from,
        "question_to": question_to,
        "question_type": question_type
    }

    # 1. Read PDF bytes
    pdf_bytes = await file.read()

    # 2. Convert to image
    try:
        page_img = convert_pdf_page_to_image(pdf_bytes, page_no)
        img_w, img_h = page_img.size
        logger.info(f"Rendered page size: {img_w}x{img_h}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Detect boxes
    img_b64 = image_to_base64(page_img)
    detected_assets = call_gemini_detect_boxes(img_b64, img_w, img_h, metadata)
    logger.info(f"Gemini detected {len(detected_assets)} assets")

    # 4. Validate
    review_status = validate_detected_assets(detected_assets, metadata)

    # 5. Process crops and uploads
    results = []
    for asset in detected_assets:
        bbox = asset.get('bbox')
        if not bbox:
            continue

        clamped = clamp_bbox(bbox, img_w, img_h)
        if not clamped:
            logger.warning(f"Skipping invalid/tiny bbox for {asset['asset_key']}")
            continue

        # Crop
        png_bytes = crop_asset(page_img, clamped)

        # Upload
        storage_path = build_storage_path(metadata, asset['asset_key'])
        public_url = upload_png_to_supabase(png_bytes, storage_path)

        # Build response asset
        results.append({
            "asset_key": asset['asset_key'],
            "owner_type": asset['owner_type'],
            "owner_ref": asset['owner_ref'],
            "asset_type": "image",
            "asset_hint": asset.get('asset_hint', ''),
            "bbox": clamped,
            "storage_provider": "supabase",
            "storage_path": storage_path,
            "public_url": public_url,
            "review_status": review_status
        })

    return {"assets": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
