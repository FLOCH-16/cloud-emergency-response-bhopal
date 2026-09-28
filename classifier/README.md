# PULSE CAD // Incident Photo Classifier Service

A lightweight Python FastAPI microservice that performs zero-shot incident classification on emergency scene photos using OpenAI CLIP (`openai/clip-vit-base-patch32`) via Hugging Face `transformers`.

---

## ⚡ Specifications

- **Model**: `openai/clip-vit-base-patch32` (via `transformers.pipeline("zero-shot-image-classification")`)
- **Endpoint**: `POST /classify` (Multipart form-data: `file: <image>`)
- **Candidate Labels**:
  1. `"a photo of a building or vehicle on fire"` $\rightarrow$ Type: `"fire"`
  2. `"a photo of a car crash or road accident"` $\rightarrow$ Type: `"accident"`
  3. `"a photo of a normal scene with no emergency"` $\rightarrow$ Type: `"none"`
- **Threshold**: If top score $< 0.50$, returns `type: "uncertain"`.
- **Severity**: Returns `suggested_severity: "moderate"` by default.
- **CORS**: Enabled for `http://localhost:3000`.

---

## 🚀 Running the Service

```bash
# 1. Navigate to classifier directory
cd classifier

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Start the FastAPI server (Port 8000)
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 Testing

```bash
python3 test_classifier.py
```
