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
from PIL import Image, ImageDraw
from supabase import create_client, Client
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "hsk-assets")

# NOTE: These grid coordinates are calibrated for HSK 1 sample papers at 300 DPI.
# For other levels or layouts, these should ideally be detected or passed via API.
QUESTION_ROWS = {
    1: {"top": 775, "bottom": 957},
    2: {"top": 957, "bottom": 1138},
    3: {"top": 1138, "bottom": 1325},
    4: {"top": 1325, "bottom": 1510},
    5: {"top": 1510, "bottom": 1694},
}

CENTER_COL = {
    "left": 356,
    "right": 786,
}

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

def convert_pdf_page_to_image(pdf_bytes: bytes, page_no: int, dpi: int = 300) -> Image.Image:
    """Converts a specific PDF page to a PIL Image at high DPI."""
    logger.info(f"Rendering page {page_no} at {dpi} DPI...")
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
Detect the photographic image assets in the CENTRAL column only.

Return JSON:
{{
  "assets": [
    {{
      "x": number,
      "y": number,
      "w": number,
      "h": number,
      "asset_key": "q1_image",
      "owner_type": "question",
      "owner_ref": "1"
    }}
  ]
}}

Rules:
- Coordinates must be normalized 0-1000.
- Include the FULL visible image, not only the main object.
- Include empty/white background around the photo if it belongs to the image.
- Do NOT cut wheels, feet, heads, clocks, bowls, or hands.
- Ignore table borders, question numbers, example section, checkmarks, and X marks.
- Return only images for questions {part_metadata['question_from']} to {part_metadata['question_to']}.
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

    url = f"{GEMINI_API_BASE_URL}/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    response = requests.post(url, json=payload)
    
    if response.status_code != 200:
        logger.error(f"Gemini API error: {response.text}")
        raise HTTPException(status_code=502, detail="Gemini API failed")

    try:
        result = response.json()
        text_content = result['candidates'][0]['content']['parts'][0]['text']
        logger.info(f"RAW GEMINI JSON: {text_content}")
        
        data = json.loads(text_content)
        
        # Handle both list and object responses
        assets = []
        if isinstance(data, list):
            assets = data
        elif isinstance(data, dict):
            assets = data.get("assets", [])

        processed_assets = []
        q_start = part_metadata.get('question_from') or 1
        
        for i, asset in enumerate(assets):
            # Extract coordinates
            x = asset.get('x')
            y = asset.get('y')
            w = asset.get('w') or asset.get('width')
            h = asset.get('h') or asset.get('height')
            
            if x is None or y is None:
                box = asset.get('bbox') or asset.get('box') or asset.get('coordinates') or {}
                x = box.get('x', 0)
                y = box.get('y', 0)
                w = box.get('w') or box.get('width', 0)
                h = box.get('h') or box.get('height', 0)

            pixel_bbox = {
                'x': int((x / 1000) * img_w),
                'y': int((y / 1000) * img_h),
                'w': int((w / 1000) * img_w),
                'h': int((h / 1000) * img_h)
            }

            question_no = q_start + i
            asset_key = asset.get('asset_key') or f"q{question_no}_image"
            owner_type = asset.get('owner_type') or "question"
            owner_ref = asset.get('owner_ref') or str(question_no)

            processed_assets.append({
                "asset_key": asset_key,
                "owner_type": owner_type,
                "owner_ref": owner_ref,
                "bbox": pixel_bbox,
                "asset_hint": asset.get('asset_hint', '')
            })
                
        return processed_assets
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        raise HTTPException(status_code=502, detail="Invalid response from Gemini")

def validate_detected_assets(assets: List[Dict[str, Any]], part_metadata: Dict[str, Any]) -> str:
    """Checks if detected count matches expected count."""
    q_from = part_metadata['question_from']
    q_to = part_metadata['question_to']
    q_count = (q_to - q_from + 1) if (q_to and q_from) else 0
    q_type = part_metadata['question_type']

    expected = 0
    if q_type in ["listen_true_false_image", "read_true_false_image_word"]:
        expected = q_count
    elif q_type == "listen_choose_picture":
        expected = q_count * 3
    elif q_type in ["listen_match_picture", "read_match_picture"]:
        expected = 6

    if expected > 0 and len(assets) != expected:
        logger.warning(f"Expected {expected} assets, got {len(assets)}")
        return "needs_review"
    return "pending"

def expand_and_clamp_bbox(
    bbox: Dict[str, int],
    img_w: int,
    img_h: int,
    expand_x: int = 45,
    expand_y: int = 35,
) -> Dict[str, int]:
    """Expands the box but stays within image boundaries."""
    x = max(0, bbox["x"] - expand_x)
    y = max(0, bbox["y"] - expand_y)
    right = min(img_w, bbox["x"] + bbox["w"] + expand_x)
    bottom = min(img_h, bbox["y"] + bbox["h"] + expand_y)

    return {
        "x": x,
        "y": y,
        "w": max(1, right - x),
        "h": max(1, bottom - y),
    }

def clamp_bbox_to_row(
    bbox: Dict[str, int],
    row_top: int,
    row_bottom: int,
    col_left: int,
    col_right: int,
    padding: int = 8,
) -> Dict[str, int]:
    """Strictly clamps the box to row/column boundaries with a small safety padding."""
    left = max(col_left, bbox["x"] - padding)
    top = max(row_top, bbox["y"] - padding)
    right = min(col_right, bbox["x"] + bbox["w"] + padding)
    bottom = min(row_bottom, bbox["y"] + bbox["h"] + padding)

    return {
        "x": left,
        "y": top,
        "w": max(1, right - left),
        "h": max(1, bottom - top),
    }

def crop_asset(image: Image.Image, bbox: Dict[str, int]) -> bytes:
    """Crops an image based on bbox."""
    img_w, img_h = image.size
    left = max(0, bbox["x"])
    top = max(0, bbox["y"])
    right = min(img_w, bbox["x"] + bbox["w"])
    bottom = min(img_h, bbox["y"] + bbox["h"])

    cropped = image.crop((left, top, right, bottom))
    img_byte_arr = io.BytesIO()
    cropped.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()

def upload_png_to_supabase(png_bytes: bytes, storage_path: str) -> str:
    """Uploads bytes to Supabase Storage and returns public URL."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=storage_path,
            file=png_bytes,
            file_options={"content-type": "image/png", "x-upsert": "true"}
        )
        res = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)
        return res
    except Exception as e:
        logger.error(f"Supabase upload error for {storage_path}: {e}")
        return ""

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
    question_from: Optional[int] = Form(None),
    question_to: Optional[int] = Form(None),
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

    pdf_bytes = await file.read()

    try:
        page_img = convert_pdf_page_to_image(pdf_bytes, page_no, dpi=300)
        img_w, img_h = page_img.size
    except Exception as e:
        logger.error(f"Image conversion error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    img_b64 = image_to_base64(page_img)
    detected_assets = call_gemini_detect_boxes(img_b64, img_w, img_h, metadata)
    logger.info(f"Final detected assets after cleaning: {len(detected_assets)}")

    # Debug Overlay
    try:
        debug_img = page_img.copy()
        draw = ImageDraw.Draw(debug_img)
        for asset in detected_assets:
            box = asset.get("bbox")
            try:
                question_no = int(asset["owner_ref"])
            except (ValueError, TypeError):
                continue
                
            row = QUESTION_ROWS.get(question_no)
            if box and row:
                # Expand then clamp for the debug view as well
                expanded = expand_and_clamp_bbox(box, img_w, img_h)
                safe_box = clamp_bbox_to_row(
                    bbox=expanded,
                    row_top=row["top"],
                    row_bottom=row["bottom"],
                    col_left=CENTER_COL["left"],
                    col_right=CENTER_COL["right"],
                    padding=8,
                )

                draw.rectangle(
                    [
                        safe_box["x"],
                        safe_box["y"],
                        safe_box["x"] + safe_box["w"],
                        safe_box["y"] + safe_box["h"],
                    ],
                    outline="red",
                    width=5,
                )

        debug_io = io.BytesIO()
        debug_img.save(debug_io, format="PNG")
        debug_path = f"hsk/{hsk_level}/{exam_set_id}/{section_type}/{part_key}/debug_page_{page_no}.png"
        supabase.storage.from_(SUPABASE_BUCKET).upload(debug_path, debug_io.getvalue(), {"content-type": "image/png", "x-upsert": "true"})
    except Exception as e:
        logger.warning(f"Failed to save debug image: {e}")

    # Process crops
    review_status = validate_detected_assets(detected_assets, metadata)
    results = []
    for asset in detected_assets:
        bbox = asset.get('bbox')
        if not bbox: continue

        try:
            # 1. First expand the box to capture the full subject
            expanded_bbox = expand_and_clamp_bbox(bbox, img_w, img_h, expand_x=45, expand_y=35)
            
            # 2. Then clamp strictly to the table row/column boundaries
            try:
                question_no = int(asset["owner_ref"])
            except (ValueError, TypeError):
                logger.warning(f"Invalid owner_ref: {asset['owner_ref']}")
                continue

            row = QUESTION_ROWS.get(question_no)
            if not row:
                logger.warning(f"No row boundary for question {question_no}")
                # Fallback to expanded but unclamped if row is unknown
                safe_bbox = expanded_bbox
            else:
                safe_bbox = clamp_bbox_to_row(
                    bbox=expanded_bbox,
                    row_top=row["top"],
                    row_bottom=row["bottom"],
                    col_left=CENTER_COL["left"],
                    col_right=CENTER_COL["right"],
                    padding=8,
                )

            png_bytes = crop_asset(page_img, safe_bbox)
            storage_path = build_storage_path(metadata, asset["asset_key"])
            public_url = upload_png_to_supabase(png_bytes, storage_path)

            if not public_url: continue

            results.append({
                "asset_key": asset["asset_key"],
                "owner_type": asset["owner_type"],
                "owner_ref": asset["owner_ref"],
                "asset_type": "image",
                "asset_hint": asset.get("asset_hint", ""),
                "bbox": safe_bbox,
                "gemini_bbox": bbox,
                "storage_provider": "supabase",
                "storage_path": storage_path,
                "public_url": public_url,
                "review_status": review_status
            })
            logger.info(f"Successfully processed: {asset['asset_key']}")
        except Exception as e:
            logger.error(f"Failed to process {asset.get('asset_key')}: {e}")

    logger.info(f"Final results count: {len(results)}")
    return {"assets": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
