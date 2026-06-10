import requests
from app.core.config import settings


class GroqClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.base_url = base_url or settings.GROQ_API_URL

    def generate(self, prompt: str, model: str = "groq-1") -> dict:
        if not self.api_key:
            raise RuntimeError("Groq API key not configured")
        url = f"{self.base_url}/models/{model}/generate"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {"prompt": prompt}
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()
