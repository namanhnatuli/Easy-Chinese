# HSK Asset Service

A FastAPI backend service that receives HSK exam PDF pages, detects bounding boxes using Gemini Vision, crops the images, and uploads them to Supabase Storage.

## Setup

1.  **System Dependency (Poppler)**:
    -   macOS: `brew install poppler`
    -   Linux: `sudo apt-get install poppler-utils`

2.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment**:
    Create a `.env` file based on `.env.example`:
    ```env
    GEMINI_API_KEY=...
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
    SUPABASE_BUCKET=hsk-assets
    ```

4.  **Run Service**:
    ```bash
    python main.py
    ```
    The service will start at `http://localhost:8000`.

## API Endpoints

### `POST /detect-crop-upload`

Receives a PDF file and metadata to process a specific page.

**Form-Data Parameters**:
-   `file`: PDF blob
-   `exam_set_id`: e.g., `hsk1_sample_001`
-   `hsk_level`: e.g., `1`
-   `page_no`: 1-based page number
-   `part_key`: e.g., `listening_part_1`
-   `section_type`: `listening` or `reading`
-   `question_from`: integer
-   `question_to`: integer
-   `question_type`: e.g., `listen_true_false_image`

**Response**:
```json
{
  "assets": [
    {
      "asset_key": "q1_image",
      "owner_type": "question",
      "owner_ref": "1",
      "asset_type": "image",
      "asset_hint": "brief description",
      "bbox": { "x": 100, "y": 200, "w": 300, "h": 200 },
      "storage_provider": "supabase",
      "storage_path": "hsk/1/hsk1_sample_001/...",
      "public_url": "https://...",
      "review_status": "pending"
    }
  ]
}
```

## Storage Path Convention

Assets are saved in Supabase using the following pattern:
`hsk/{hsk_level}/{exam_set_id}/{section_type}/{part_key}/{asset_key}.png`
