"""
Self-test script for PULSE CLIP zero-shot incident classification service.
Tests the FastAPI endpoint /classify with test images.
"""

import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from main import app, CANDIDATE_LABELS, LABEL_TO_TYPE_MAP

client = TestClient(app)

def create_synthetic_image(color_theme="fire"):
    """Creates a simple PIL image for testing."""
    img = Image.new("RGB", (224, 224), color=(30, 30, 30))
    draw = ImageDraw.Draw(img)

    if color_theme == "fire":
        # Draw bright orange/red flame-like polygons
        draw.rectangle([20, 100, 204, 204], fill=(220, 50, 0))
        draw.polygon([(112, 20), (50, 140), (174, 140)], fill=(255, 180, 0))
    elif color_theme == "accident":
        # Draw metallic vehicle-like rectangles and road
        draw.rectangle([0, 160, 224, 224], fill=(80, 80, 80)) # Road
        draw.rectangle([40, 110, 120, 160], fill=(50, 80, 180)) # Car 1
        draw.rectangle([100, 105, 180, 155], fill=(180, 40, 40)) # Car 2 colliding
    else:
        # Normal calm scene (green park)
        draw.rectangle([0, 0, 224, 224], fill=(100, 180, 100))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    print("✓ GET /health passed:", data)

def test_classify_mock_or_real():
    img_buf = create_synthetic_image("fire")
    response = client.post(
        "/classify",
        files={"file": ("test_fire.jpg", img_buf, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    print("✓ POST /classify response for fire image:", data)
    assert "type" in data
    assert "confidence" in data
    assert "suggested_severity" in data
    assert data["suggested_severity"] == "moderate"
    assert data["type"] in ["fire", "accident", "none", "uncertain"]
    print("✓ Schema validation passed!")

if __name__ == "__main__":
    print("Running classifier unit tests...")
    test_health()
    print("Testing image classification endpoint...")
    test_classify_mock_or_real()
    print("All classifier tests passed successfully!")
