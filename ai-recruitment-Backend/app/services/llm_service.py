"""
AI LLM Service - supports OpenAI, Groq, and Ollama.
Provides: text generation, embeddings, structured extraction.
"""
import json
from typing import Optional, Any
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = structlog.get_logger()


class LLMService:
    """
    Unified LLM service with provider abstraction.
    Supports OpenAI GPT, Groq, and Ollama.
    """

    def __init__(self):
        self.provider = settings.ai_provider
        self._client = None
        self._embedding_client = None

    def _get_client(self, api_key: str = None):
        key = api_key or settings.groq_api_key
        if self.provider == "openai":
            from openai import AsyncOpenAI
            return AsyncOpenAI(api_key=settings.openai_api_key)
        elif self.provider == "groq":
            from openai import AsyncOpenAI
            return AsyncOpenAI(
                api_key=key,
                base_url="https://api.groq.com/openai/v1",
            )
        elif self.provider == "ollama":
            from openai import AsyncOpenAI
            return AsyncOpenAI(
                api_key="ollama",
                base_url=f"{settings.ollama_base_url}/v1",
            )
        return self._client

    def _get_model(self) -> str:
        if self.provider == "openai":
            return settings.openai_model
        elif self.provider == "groq":
            return settings.groq_model
        elif self.provider == "ollama":
            return settings.ollama_model
        return "gpt-4o-mini"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> str:
        """Generate text completion with automatic key fallback."""
        keys = [k for k in [settings.groq_api_key, settings.groq_api_key_2] if k]
        if self.provider != "groq":
            keys = [None]
        last_error = None
        for key in keys:
            try:
                client = self._get_client(key)
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                response = await client.chat.completions.create(
                    model=self._get_model(),
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content
            except Exception as e:
                last_error = e
                logger.warning("LLM key failed, trying next", error=str(e))
                continue
        raise last_error

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
    ) -> dict:
        """Generate and parse JSON response."""
        json_system = (system_prompt or "") + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation."

        response_text = await self.generate(
            prompt=prompt,
            system_prompt=json_system,
            temperature=temperature,
            max_tokens=3000,
        )

        # Clean response
        text = response_text.strip()
        
        # Handle markdown code blocks
        if "```" in text:
            # Try to extract content between ```json and ``` or just ``` and ```
            import re
            json_block = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
            if json_block:
                text = json_block.group(1)
            else:
                # Fallback: remove the first and last line if they contain ```
                lines = text.split("\n")
                if "```" in lines[0]:
                    lines = lines[1:]
                if lines and "```" in lines[-1]:
                    lines = lines[:-1]
                text = "\n".join(lines).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error("JSON parse failed", error=str(e), response=text[:200])
            # Try to extract the first { and last }
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            raise ValueError(f"Could not parse JSON from LLM response: {e}")

    async def generate_chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate response in chat format with automatic key fallback."""
        keys = [k for k in [settings.groq_api_key, settings.groq_api_key_2] if k]
        if self.provider != "groq":
            keys = [None]
        last_error = None
        for key in keys:
            try:
                client = self._get_client(key)
                response = await client.chat.completions.create(
                    model=self._get_model(),
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content
            except Exception as e:
                last_error = e
                logger.warning("LLM key failed, trying next", error=str(e))
                continue
        raise last_error

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_embedding(self, text: str) -> list[float]:
        """Get embedding vector for text."""
        if self.provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            # Truncate to avoid token limit
            text = text[:8000]
            response = await client.embeddings.create(
                model=settings.openai_embedding_model,
                input=text,
            )
            return response.data[0].embedding
        else:
            # Fallback: use sentence transformers locally
            return await self._local_embedding(text)

    async def get_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Get embeddings for multiple texts."""
        if self.provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            # Batch in groups of 100
            all_embeddings = []
            for i in range(0, len(texts), 100):
                batch = [t[:8000] for t in texts[i:i+100]]
                response = await client.embeddings.create(
                    model=settings.openai_embedding_model,
                    input=batch,
                )
                all_embeddings.extend([e.embedding for e in response.data])
            return all_embeddings
        else:
            return [await self._local_embedding(t) for t in texts]

    async def _local_embedding(self, text: str) -> list[float]:
        """Fallback embedding using a local model."""
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            embedding = model.encode(text).tolist()
            # Pad/trim to match expected dimension
            target_dim = settings.embedding_dimension
            if len(embedding) < target_dim:
                embedding.extend([0.0] * (target_dim - len(embedding)))
            return embedding[:target_dim]
        except ImportError:
            import random
            logger.warning("No embedding model available, using random (development only)")
            return [random.gauss(0, 0.1) for _ in range(settings.embedding_dimension)]


# Global singleton
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
