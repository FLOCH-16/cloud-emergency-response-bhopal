import io
import logging
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pulse-classifier")

app = FastAPI(
    title="PULSE CAD Photo Incident Classifier",
    description="Zero-shot emergency incident classifier powered by OpenAI CLIP ViT-B/32",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Candidate labels requested in specification
CANDIDATE_LABELS = [
    "a photo of a building or vehicle on fire",
    "a photo of a car crash or road accident",
    "a photo of a normal scene with no emergency"
]

LABEL_TO_TYPE_MAP = {
    "a photo of a building or vehicle on fire": "fire",
    "a photo of a car crash or road accident": "accident",
    "a photo of a normal scene with no emergency": "none"
}

# Lazy loading of pipeline to avoid startup delay if initialized on import
_classifier = None

def get_classifier():
    global _classifier
    if _classifier is None:
        logger.info("Loading CLIP zero-shot classification pipeline: openai/clip-vit-base-patch32...")
        try:
            from transformers import pipeline
            _classifier = pipeline(
                "zero-shot-image-classification",
                model="openai/clip-vit-base-patch32"
            )
            logger.info("CLIP pipeline successfully loaded and ready.")
        except Exception as e:
            logger.error(f"Failed to load pipeline: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"CLIP model pipeline could not be loaded: {str(e)}"
            )
    return _classifier


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "pulse-incident-classifier",
        "model": "openai/clip-vit-base-patch32"
    }


@app.post("/classify")
async def classify_incident_photo(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Accepts an uploaded incident photo, runs zero-shot image classification via CLIP,
    and returns detected incident type, confidence, and suggested severity.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        # Still attempt to read if filename extension is image-like
        ext = file.filename.split(".")[-1].lower() if file.filename else ""
        if ext not in ["jpg", "jpeg", "png", "webp", "bmp", "gif"]:
            raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, WebP).")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as err:
        logger.warning(f"Could not decode image: {err}")
        raise HTTPException(status_code=400, detail=f"Corrupt or unsupported image file: {str(err)}")

    classifier = get_classifier()

    try:
        # Pipeline returns list of dicts: [{'score': float, 'label': str}, ...]
        results = classifier(image, candidate_labels=CANDIDATE_LABELS)
    except Exception as err:
        logger.error(f"Classification inference error: {err}")
        raise HTTPException(status_code=500, detail=f"Inference error during CLIP classification: {str(err)}")

    if not results or len(results) == 0:
        return {
            "type": "uncertain",
            "confidence": 0.0,
            "suggested_severity": "moderate",
            "scores": {},
            "raw_label": None
        }

    # Extract top prediction
    top_result = results[0]
    top_label = top_result["label"]
    top_score = float(top_result["score"])

    # Score breakdown map
    scores_dict = {r["label"]: round(float(r["score"]), 4) for r in results}

    # If top score is below 0.5, return type 'uncertain'
    if top_score < 0.5:
        incident_type = "uncertain"
    else:
        incident_type = LABEL_TO_TYPE_MAP.get(top_label, "uncertain")

    return {
        "type": incident_type,
        "confidence": round(top_score, 4),
        "suggested_severity": "moderate",
        "top_label": top_label,
        "scores": scores_dict
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
