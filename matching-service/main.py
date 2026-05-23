from fastapi import FastAPI
from pydantic import BaseModel, Field

from matching_engine import recomendar

app = FastAPI(title="Psique Matching Service", version="1.0.0")


# =========================================================
# Pydantic models — contrato NestJS ↔ Python
# =========================================================

class PatientPayload(BaseModel):
    motivo_terapia: int = Field(..., ge=0, le=5)
    abordagem: int = Field(..., ge=0, le=5)
    estilo_terapeutico: int = Field(..., ge=0, le=4)
    objetivo: int = Field(..., ge=0, le=3)
    genero: int = Field(..., ge=0, le=4)
    experiencia: int = Field(..., ge=0, le=4)
    contextos: list[int] = Field(..., min_length=5, max_length=5)
    ignora_contextos: bool = False
    tempo_busca: int = Field(..., ge=0, le=3)
    experiencia_previa: int = Field(..., ge=0, le=2)
    precisa_suporte_fora: bool = False
    restricao_horario: bool = False


class ProfessionalPayload(BaseModel):
    id: str
    motivos_terapia: list[int] = Field(..., min_length=5, max_length=5)
    abordagem: int = Field(..., ge=0, le=6)
    estilo_terapeutico: int = Field(..., ge=0, le=3)
    objetivo: int = Field(..., ge=0, le=2)
    genero: int = Field(..., ge=0, le=2)
    experiencia: int = Field(..., ge=0, le=2)
    contextos: list[int] = Field(..., min_length=5, max_length=5)
    suporte_fora: int = Field(..., ge=0, le=2)
    periodo_atendimento: int = Field(..., ge=0, le=2)


class MatchRequest(BaseModel):
    patient: PatientPayload
    professionals: list[ProfessionalPayload] = Field(..., min_length=1)


class MatchResponseItem(BaseModel):
    professional_id: str
    score_display: float
    score_bruto: float
    cosine: float
    hamming: float
    penalidade: float
    mod_clinico: float
    explicacoes: list[str]


class MatchResponse(BaseModel):
    recommendations: list[MatchResponseItem]


# =========================================================
# Endpoints
# =========================================================

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/match", response_model=MatchResponse)
def match(request: MatchRequest):
    paciente_dict = request.patient.model_dump()
    profissionais_list = [p.model_dump() for p in request.professionals]

    resultados = recomendar(paciente_dict, profissionais_list)

    recommendations: list[MatchResponseItem] = []
    for r in resultados:
        prof = r["profissional"]
        recommendations.append(MatchResponseItem(
            professional_id=prof["id"],
            score_display=r["score_display"],
            score_bruto=r["score_bruto"],
            cosine=r["cosine"],
            hamming=r["hamming"],
            penalidade=r["penalidade"],
            mod_clinico=r["mod_clinico"],
            explicacoes=r["explicacoes"],
        ))

    return MatchResponse(recommendations=recommendations)
