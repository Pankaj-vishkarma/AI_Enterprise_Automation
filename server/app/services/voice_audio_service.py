import io
import logging
from typing import Optional, Tuple

from app.clients.groq_client import GroqClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class VoiceAudioService:
    def __init__(self):
        self.groq = GroqClient()

    def capabilities(self) -> dict:
        stt_provider = (settings.VOICE_STT_PROVIDER or "browser").lower()
        tts_provider = (settings.VOICE_TTS_PROVIDER or "browser").lower()
        stt_available = stt_provider == "groq" and bool(settings.GROQ_API_KEY)
        tts_available = tts_provider == "gtts" and self._gtts_available()
        return {
            "stt": {
                "provider": stt_provider if stt_available else "browser",
                "configured_provider": stt_provider,
                "available": stt_available,
            },
            "tts": {
                "provider": tts_provider if tts_available else "browser",
                "configured_provider": tts_provider,
                "available": tts_available,
            },
            "fallback": {"stt": "browser", "tts": "browser"},
        }

    @staticmethod
    def _gtts_available() -> bool:
        try:
            import gtts  # noqa: F401
            return True
        except ImportError:
            return False

    def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> Tuple[str, str]:
        provider = (settings.VOICE_STT_PROVIDER or "browser").lower()
        if provider == "groq" and settings.GROQ_API_KEY:
            try:
                text = self.groq.transcribe_audio(audio_bytes, filename=filename)
                if text:
                    return text, "groq"
            except Exception as exc:
                logger.warning("Groq STT failed, use browser fallback: %s", exc)
        return "", "browser"

    def synthesize(self, text: str) -> Tuple[Optional[bytes], str, str]:
        cleaned = (text or "").strip()
        if not cleaned:
            return None, "browser", "audio/mpeg"
        provider = (settings.VOICE_TTS_PROVIDER or "browser").lower()
        if provider == "gtts" and self._gtts_available():
            try:
                from gtts import gTTS

                buffer = io.BytesIO()
                gTTS(text=cleaned, lang=settings.VOICE_TTS_LANGUAGE).write_to_fp(buffer)
                buffer.seek(0)
                return buffer.read(), "gtts", "audio/mpeg"
            except Exception as exc:
                logger.warning("gTTS synthesis failed, use browser fallback: %s", exc)
        return None, "browser", "audio/mpeg"
