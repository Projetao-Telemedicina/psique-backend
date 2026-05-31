# Psique Matching Service

Microservico de recomendacao paciente ↔ profissional usando score hibrido
(Cosine Similarity + Hamming Ponderado).

## Requisitos

- Python 3.11+
- pip

## Instalacao

```bash
cd matching-service
pip install -r requirements.txt
```

## Executar

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

O servico expoe:

- `GET  /health` — health check
- `POST /match`  — recebe paciente + lista de profissionais e retorna top-N recomendacoes

Documentacao interativa disponivel em:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Teste rapido

```bash
python matching_engine.py
```

Gera dados ficticios e exibe as recomendacoes no terminal.

## Contrato

### POST /match

Request:

```json
{
  "patient": {
    "motivo_terapia": 0,
    "abordagem": 1,
    "estilo_terapeutico": 2,
    "objetivo": 0,
    "genero": 3,
    "experiencia": 1,
    "contextos": [1, 0, 0, 0, 1],
    "ignora_contextos": false,
    "tempo_busca": 1,
    "experiencia_previa": 0,
    "precisa_suporte_fora": false,
    "restricao_horario": false
  },
  "professionals": [
    {
      "id": "uuid-do-profissional",
      "motivos_terapia": [1, 0, 1, 0, 0],
      "abordagem": 1,
      "estilo_terapeutico": 2,
      "objetivo": 0,
      "genero": 0,
      "experiencia": 1,
      "contextos": [1, 0, 1, 0, 1],
      "suporte_fora": 1,
      "periodo_atendimento": 0
    }
  ]
}
```

Response:

```json
{
  "recommendations": [
    {
      "professional_id": "uuid-do-profissional",
      "score_display": 100.0,
      "score_bruto": 8.1234,
      "cosine": 0.8765,
      "hamming": 0.1234,
      "penalidade": 0.0,
      "mod_clinico": 0.0,
      "explicacoes": ["Abordagem compativel: Psicanalise"]
    }
  ]
}
```
