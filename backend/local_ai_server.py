"""
local_ai_server.py — Minimal local model server for ExamTrust AI feature
Uses llama-cpp-python to load a GGML/GGUF model and serve it via Flask.

Requirements:
    pip install llama-cpp-python flask

Usage:
    python local_ai_server.py --model C:/models/your-model.gguf
    # or set env var MODEL_PATH before running:
    #   set MODEL_PATH=C:\models\your-model.gguf && python local_ai_server.py

Then in .env:
    AI_PROVIDER=local
    AI_LOCAL_URL=http://localhost:8080/generate
"""

import argparse
import json
import os
import re
import sys

from flask import Flask, request, Response

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

def load_model(model_path: str, n_ctx: int = 4096, n_threads: int = 4):
    try:
        from llama_cpp import Llama  # type: ignore
    except ImportError:
        print("ERROR: llama-cpp-python not installed.")
        print("  Run:  pip install llama-cpp-python")
        sys.exit(1)

    if not os.path.isfile(model_path):
        print(f"ERROR: Model file not found: {model_path}")
        print("  Download a GGUF model from Hugging Face (search 'GGUF' models).")
        print("  Example: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF")
        print("  Recommended: mistral-7b-instruct-v0.2.Q4_K_M.gguf (4-6 GB, runs on CPU)")
        sys.exit(1)

    print(f"Loading model from {model_path} …")
    llm = Llama(
        model_path=model_path,
        n_ctx=n_ctx,
        n_threads=n_threads,
        verbose=False,
    )
    print("Model loaded. Server starting …")
    return llm


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = Flask(__name__)
_llm = None  # will be set after arg parsing


def _extract_json(text: str) -> str:
    """Try to pull the first valid JSON object out of model output."""
    # Try to find a {...} block (model sometimes adds extra text)
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        candidate = match.group(0)
        try:
            json.loads(candidate)  # validate
            return candidate
        except json.JSONDecodeError:
            pass
    return text.strip()


@app.post("/generate")
def generate():
    global _llm
    data = request.get_json(silent=True) or {}
    prompt: str = data.get("prompt", "")

    if not prompt:
        return Response(
            json.dumps({"error": "No prompt provided"}),
            status=400,
            mimetype="application/json",
        )

    # Instruct-style wrap if model expects it (works for Mistral/Llama-2-chat)
    formatted = f"[INST] {prompt} [/INST]"

    try:
        result = _llm(
            formatted,
            max_tokens=512,
            temperature=0.2,
            stop=["[INST]", "</s>"],
            echo=False,
        )
        text: str = result["choices"][0]["text"].strip()
        cleaned = _extract_json(text)
        return Response(cleaned, status=200, mimetype="text/plain")
    except Exception as exc:
        return Response(
            json.dumps({"error": str(exc)}),
            status=500,
            mimetype="application/json",
        )


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _llm is not None}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local AI model server for ExamTrust")
    parser.add_argument(
        "--model",
        default=os.environ.get("MODEL_PATH", ""),
        help="Path to the GGUF model file (e.g. C:/models/mistral-7b.Q4_K_M.gguf)",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on (default: 8080)")
    parser.add_argument("--ctx", type=int, default=4096, help="Context window size (default: 4096)")
    parser.add_argument("--threads", type=int, default=4, help="CPU threads for inference (default: 4)")
    args = parser.parse_args()

    if not args.model:
        print("ERROR: No model path specified.")
        print("  Use: python local_ai_server.py --model C:/path/to/model.gguf")
        print("  Or:  set MODEL_PATH=C:\\path\\to\\model.gguf")
        sys.exit(1)

    _llm = load_model(args.model, n_ctx=args.ctx, n_threads=args.threads)
    app.run(host=args.host, port=args.port)
