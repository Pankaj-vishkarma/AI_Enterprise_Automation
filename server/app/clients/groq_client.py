import requests
from app.core.config import settings


class GroqClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.base_url = base_url or settings.GROQ_API_URL
        if self.base_url and self.base_url.rstrip("/").endswith("/v1") and "/openai/v1" not in self.base_url:
            self.base_url = self.base_url.rstrip("/")[:-3] + "/openai/v1"

    def generate(self, prompt: str, model: str | None = None) -> dict:
        if not self.api_key:
            raise RuntimeError("Groq API key not configured")
        url = f"{self.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or settings.GROQ_MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        data = r.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = data.get("usage") or {}
        return {
            "output": {"text": text},
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
            "raw": data,
        }
