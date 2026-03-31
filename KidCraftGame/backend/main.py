import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for local index.html
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For local testing file:// and localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

class BuildRequest(BaseModel):
    prompt: str

import urllib.request

@app.get("/api/build")
def build(prompt: str):
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("⚠️ GEMINI_API_KEY not found in environment. Falling back to mock generator.")
        return generate_mock_fallback(prompt)

    system_prompt = (
        "You are a Voxel art generator for a child's web game. "
        "Given a prompt, return a pure JSON list of block positions to build it. "
        "The player is at a ground coordinate close to center. "
        "Build the structure in front of the player (offset on Z or X axis). "
        "Use ONLY these block types: ['grass', 'wood', 'stone', 'leaves', 'water']. "
        "Output MUST be a valid JSON array like: "
        "[{\"x\": 0, \"y\": 1, \"z\": -5, \"block\": \"stone\"}]. "
        "Return between 20 and 100 blocks. "
        "Do NOT wrap the output in markdown code blocks or any other explanation. "
        "Return ONLY the raw [{\"x\": ..., \"y\": ..., ...}] JSON array string."
    )

    full_query = f"Prompt: {prompt}\nSystem Instructions: {system_prompt}"

    payload = {
        "contents": [{
            "parts": [{"text": full_query}]
        }]
    }

    try:
        url = f"{GEMINI_URL}?key={api_key}"
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'), 
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as f:
            response_text = f.read().decode('utf-8')
        
        data = json.loads(response_text)
        text_content = data['candidates'][0]['content']['parts'][0]['text']
        
        # Clean up any potential markdown formatting if LLM failed to follow rules
        cleaned_text = text_content.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        # Parse valid JSON to ensure correctness
        block_list = json.loads(cleaned_text)
        return block_list

    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        # If API fails, return a cute dinosaur mock fallback so the kid isn't disappointed!
        return generate_mock_fallback(prompt)

def generate_mock_fallback(prompt):
    """
    Cute fallback if no API key or failure (a little 3x3 dinosaur or house).
    """
    blocks = []
    # Base flat 4x4
    for x in range(-2, 3):
        for z in range(-5, 0):
            blocks.append({"x": x, "y": 0, "z": z, "block": "stone"})
    
    # Simple upright neck
    blocks.append({"x": 0, "y": 1, "z": -2, "block": "leaves"})
    blocks.append({"x": 0, "y": 2, "z": -2, "block": "leaves"})
    blocks.append({"x": 0, "y": 3, "z": -2, "block": "leaves"})
    blocks.append({"x": 0, "y": 3, "z": -1, "block": "leaves"}) # snout
    
    # Body
    blocks.append({"x": 0, "y": 1, "z": -4, "block": "leaves"})
    blocks.append({"x": -1, "y": 1, "z": -3, "block": "leaves"})
    blocks.append({"x": 1, "y": 1, "z": -3, "block": "leaves"})

    return blocks
