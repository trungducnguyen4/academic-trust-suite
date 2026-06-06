# AI Deployment Notes for ExamTrust

This project uses a separate AI worker and a Redis queue, so exam flow is not blocked by AI generation.

## Recommended Ollama profile

- `AI_PROVIDER=ollama`
- `AI_OLLAMA_URL=http://ollama:11434`
- `AI_OLLAMA_MODEL=gemma3:4b`
- `AI_OLLAMA_TEMPERATURE=0.2`
- `AI_OLLAMA_TOP_P=0.85`
- `AI_OLLAMA_REPEAT_PENALTY=1.1`
- `AI_OLLAMA_NUM_CTX=8192`
- `AI_APP_NAME=ExamTrust`
- `AI_DEFAULT_LANGUAGE=vi`

## Why this model

`gemma3:4b` is a lightweight default that fits the current project well:

- enough for exam question drafting and topic matching
- lower RAM usage than larger models
- good for a thesis/demo deployment without overloading the host

If you have more memory and want stronger structured output, you can switch to a larger instruct model later.

## Minimal Ollama deployment

Keep these settings for production:

- turn off cloud features
- turn off auto-download updates
- keep Ollama private inside Docker if possible
- persist models on disk with a volume

Recommended compose setup:

```yaml
ollama:
  image: ollama/ollama:latest
  environment:
    OLLAMA_HOST: "0.0.0.0:11434"
  volumes:
    - ollama_data:/root/.ollama
```

First time setup:

```bash
docker compose exec ollama ollama pull gemma3:4b
```

## Resource guideline

- minimum: 4-6 GB RAM for a small model
- recommended: 8-12 GB RAM for smoother AI generation
- keep AI worker separate from the main API

## Important note

Do not expose Ollama publicly unless you really need to. The backend and worker should talk to it over the private Docker network.
