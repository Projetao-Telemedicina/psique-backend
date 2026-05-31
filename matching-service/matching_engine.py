import random
import numpy as np

# =========================================================
# CONFIGURAÇÃO GERAL
# =========================================================

TOP_N = 10

# Pesos do score híbrido final
PESO_COSINE  = 12
PESO_HAMMING = 8

# Penalidades (soft constraints)
PENALIDADE_GENERO      = 6
PENALIDADE_EXPERIENCIA = 2

# Bônus clínico por urgência / vulnerabilidade do paciente
# Aplicado quando o paciente está em sofrimento recente + sem experiência em terapia
BONUS_URGENCIA_ACOLHIMENTO = 0.5  # reduz penalidade de estilo não-acolhedor

# Pesos por categoria no Hamming ponderado
PESOS_CATEGORIAS = {
    "motivo_terapia": 4,
    "abordagem":      5,
    "estilo":         5,   # representa apenas postura (processo)
    "objetivo":       4,   # representa apenas resultado esperado
    "contextos":      5,
}

# Máximo teórico do Hamming (calculado abaixo após definir CONTEXTOS_LABELS)

# =========================================================
# MAPEAMENTOS
# =========================================================

MOTIVOS = {
    0: "Saúde emocional",
    1: "Relacionamentos",
    2: "Vida profissional",
    3: "Autoconhecimento",
    4: "Crises e perdas",
    5: "Não tenho certeza",  # apenas paciente
}

ABORDAGENS = {
    0: "TCC",
    1: "Psicanálise",
    2: "Humanista",
    3: "Corporal",
    4: "Sistêmica",
    5: "Não sei / Quero indicação",  # apenas paciente
    6: "Outra",                       # apenas profissional → tratado como neutro
}

ESTILOS = {
    0: "Ativo e direto",
    1: "Reflexivo e analítico",
    2: "Acolhedor e suporte",
    3: "Equilibrado / Flexível",
    4: "Não sei",  # apenas paciente
}

OBJETIVOS = {
    0: "Clareza e profundidade",
    1: "Resolução e praticidade",
    2: "Ambos",
    3: "Não tenho certeza",  # apenas paciente
}

GENEROS_PACIENTE = {
    0: "Mulher",
    1: "Homem",
    2: "Pessoa não-binária",
    3: "Sem preferência",
    4: "Quero ver perfis variados",
}

GENEROS_PROFISSIONAL = {
    0: "Mulher",
    1: "Homem",
    2: "Pessoa não-binária",
}

EXPERIENCIA_PACIENTE = {
    0: "Conectado às novas tendências",
    1: "Equilíbrio teoria e prática",
    2: "Trajetória consolidada",
    3: "Sem preferência",
    4: "Quero ver perfis variados",
}

EXPERIENCIA_PROFISSIONAL = {
    0: "Até 5 anos",
    1: "5 a 15 anos",
    2: "Mais de 15 anos",
}

TEMPO_BUSCA = {
    0: "Recentemente (algumas semanas)",
    1: "Há alguns meses",
    2: "Há um ano ou mais",
    3: "Não sei dizer ao certo",
}

EXPERIENCIA_PREVIA = {
    0: "Nunca fiz terapia",
    1: "Já fiz e tive boas experiências",
    2: "Já fiz, mas tive dificuldade de adaptação",
}

SUPORTE_FORA = {
    0: "Ofereço suporte pontual por mensagens",
    1: "Limitado",
    2: "Não ofereço suporte fora da sessão",
}

PERIODO_ATENDIMENTO = {
    0: "Integral",
    1: "Parcial",
    2: "Pontual",
}

CONTEXTOS_LABELS = [
    "LGBTQIA+",
    "Étnico-racial",
    "Neurodiversidade",
    "Feminismo",
    "Espiritualidade",
]

# Máximo teórico do Hamming
HAMMING_MAX = (
    PESOS_CATEGORIAS["motivo_terapia"]
    + PESOS_CATEGORIAS["abordagem"]
    + PESOS_CATEGORIAS["estilo"]
    + PESOS_CATEGORIAS["objetivo"]
    + PESOS_CATEGORIAS["contextos"] * len(CONTEXTOS_LABELS)
)


# =========================================================
# NORMALIZAÇÃO DE ENTRADA
# Converte os payloads recebidos do back (listas Python)
# para o formato interno usado pelo algoritmo (np.ndarray).
# Isola a adaptação de contrato em um único lugar.
# =========================================================

def normalizar_paciente(payload: dict) -> dict:
    """
    Converte o PatientPayload recebido do back para o formato
    interno do algoritmo.

    Única diferença do contrato para o formato interno:
    - contextos: list[int] → np.ndarray
    """
    paciente = dict(payload)
    paciente["contextos"] = np.array(payload["contextos"], dtype=int)
    return paciente


def normalizar_profissional(payload: dict) -> dict:
    """
    Converte o ProfessionalPayload recebido do back para o formato
    interno do algoritmo.

    Diferenças do contrato para o formato interno:
    - motivos_terapia: list[int] → np.ndarray
    - contextos:       list[int] → np.ndarray
    - id: preservado sem alteração
    """
    profissional = dict(payload)
    profissional["motivos_terapia"] = np.array(payload["motivos_terapia"], dtype=int)
    profissional["contextos"]       = np.array(payload["contextos"],       dtype=int)
    return profissional


# =========================================================
# FILTROS HARD
# =========================================================

def aplicar_filtros_hard(
    paciente: dict,
    profissionais: list[dict]
) -> list[dict]:
    """
    Remove profissionais que não atendem a critérios logísticos obrigatórios.

    Filtros ativos:
    - Suporte fora das sessões: se o paciente exige suporte (0), profissionais
      que não oferecem (2) são excluídos.
    - Período de atendimento: se o paciente tem restrição de turno, profissionais
      com disponibilidade "pontual" (2) são excluídos, pois têm poucos horários.
    """

    filtrados = []

    for prof in profissionais:

        # Filtro 1: suporte fora das sessões
        if (
            paciente.get("precisa_suporte_fora") == True
            and prof["suporte_fora"] == 2
        ):
            continue

        # Filtro 2: disponibilidade
        if (
            paciente.get("restricao_horario") == True
            and prof["periodo_atendimento"] == 2
        ):
            continue

        filtrados.append(prof)

    return filtrados


# =========================================================
# ONE-HOT ENCODING
# =========================================================

def one_hot(valor: int, n_classes: int) -> np.ndarray:
    """
    Converte uma categoria nominal em vetor binário.
    Necessário para que o cosine similarity não interprete
    categorias como tendo relação ordinal implícita.
    """
    v = np.zeros(n_classes)
    if 0 <= valor < n_classes:
        v[valor] = 1
    return v


def vetorizar(perfil: dict, eh_profissional: bool = False) -> np.ndarray:
    """
    Converte um perfil em vetor numérico via one-hot encoding.
    """

    partes = []

    # --- Motivo: 6 classes (0-5) ---
    if eh_profissional:
        motivo_vec = np.append(
            perfil["motivos_terapia"].astype(float), 0.0
        )
        norma = np.linalg.norm(motivo_vec)
        if norma > 0:
            motivo_vec = motivo_vec / norma
        partes.append(motivo_vec)
    else:
        partes.append(one_hot(perfil["motivo_terapia"], n_classes=6))

    # --- Abordagem: 7 classes (0-6, sendo 6 = "Outra") ---
    partes.append(one_hot(perfil["abordagem"], n_classes=7))

    # --- Estilo (postura): 5 classes ---
    partes.append(one_hot(perfil["estilo_terapeutico"], n_classes=5))

    # --- Objetivo (resultado): 4 classes ---
    partes.append(one_hot(perfil["objetivo"], n_classes=4))

    # --- Gênero: 5 classes ---
    partes.append(one_hot(perfil["genero"], n_classes=5))

    # --- Experiência: 5 classes ---
    partes.append(one_hot(perfil["experiencia"], n_classes=5))

    # --- Contextos: binários ---
    partes.append(perfil["contextos"].astype(float))

    # --- tempo_busca e experiencia_previa (só paciente) ---
    if not eh_profissional:
        partes.append(one_hot(perfil.get("tempo_busca", 3), n_classes=4))
        partes.append(one_hot(perfil.get("experiencia_previa", 0), n_classes=3))
    else:
        partes.append(np.zeros(4))  # padding tempo_busca
        partes.append(np.zeros(3))  # padding experiencia_previa

    return np.concatenate(partes)


# =========================================================
# COSINE SIMILARITY
# =========================================================

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    norma1 = np.linalg.norm(v1)
    norma2 = np.linalg.norm(v2)
    if norma1 == 0 or norma2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norma1 * norma2))


# =========================================================
# HAMMING PONDERADO (normalizado)
# =========================================================

def hamming_ponderado(paciente: dict, profissional: dict) -> float:
    """
    Mede incompatibilidades pontuais, normalizado para [0, 1].
    """

    distancia = 0

    # --- Motivo da terapia (multi-label no profissional) ---
    if paciente["motivo_terapia"] != 5:  # 5 = "não tenho certeza"
        motivo_idx = paciente["motivo_terapia"]
        if profissional["motivos_terapia"][motivo_idx] == 0:
            distancia += PESOS_CATEGORIAS["motivo_terapia"]

    # --- Abordagem ---
    if paciente["abordagem"] != 5:  # 5 = "não sei / quero indicação"
        if (
            profissional["abordagem"] != 6
            and paciente["abordagem"] != profissional["abordagem"]
        ):
            distancia += PESOS_CATEGORIAS["abordagem"]

    # --- Estilo (postura) ---
    if paciente["estilo_terapeutico"] != 4:  # 4 = "não sei"
        if paciente["estilo_terapeutico"] != profissional["estilo_terapeutico"]:
            distancia += PESOS_CATEGORIAS["estilo"]

    # --- Objetivo (resultado) ---
    if paciente["objetivo"] != 3:  # 3 = "não tenho certeza"
        if paciente["objetivo"] != profissional["objetivo"]:
            distancia += PESOS_CATEGORIAS["objetivo"]

    # --- Contextos (multi-label) ---
    if not paciente.get("ignora_contextos", False):
        ausencias = np.sum(
            (paciente["contextos"] == 1) & (profissional["contextos"] == 0)
        )
        distancia += int(ausencias) * PESOS_CATEGORIAS["contextos"]

    return distancia / HAMMING_MAX


# =========================================================
# MODIFICADOR CLÍNICO
# =========================================================

def calcular_modificador_clinico(paciente: dict, profissional: dict) -> float:
    """
    Aplica ajustes finos ao score com base no contexto clínico do paciente.
    """

    modificador = 0.0

    tempo_busca       = paciente.get("tempo_busca", 3)
    experiencia_prev  = paciente.get("experiencia_previa", 1)
    estilo_prof       = profissional["estilo_terapeutico"]

    # Paciente iniciante em sofrimento agudo
    if tempo_busca == 0 and experiencia_prev == 0:
        if estilo_prof in (2, 3):   # acolhedor ou equilibrado
            modificador += 1.0
        elif estilo_prof == 0:      # ativo/direto → leve penalidade
            modificador -= 0.5

    # Paciente com experiência prévia negativa
    elif experiencia_prev == 2:
        if estilo_prof == 2:        # acolhedor → bonifica
            modificador += 0.8
        elif estilo_prof == 0:      # ativo/direto → penalidade moderada
            modificador -= 0.3

    return modificador


# =========================================================
# SCORE FINAL
# =========================================================

def calcular_score(
    paciente: dict,
    profissional: dict
) -> dict:
    """
    Score híbrido: cosine similarity + Hamming ponderado normalizado
    + penalidades de gênero/experiência + modificador clínico.
    """

    vetor_paciente     = vetorizar(paciente,     eh_profissional=False)
    vetor_profissional = vetorizar(profissional, eh_profissional=True)

    cos = cosine_similarity(vetor_paciente, vetor_profissional)
    ham = hamming_ponderado(paciente, profissional)

    # --- Penalidades (soft constraints) ---
    penalidade = 0.0

    if paciente["genero"] not in (3, 4):
        if paciente["genero"] != profissional["genero"]:
            penalidade += PENALIDADE_GENERO

    if paciente["experiencia"] not in (3, 4):
        distancia_exp = abs(
            paciente["experiencia"] - profissional["experiencia"]
        )
        penalidade += distancia_exp * PENALIDADE_EXPERIENCIA

    # --- Modificador clínico ---
    mod_clinico = calcular_modificador_clinico(paciente, profissional)

    score_bruto = (
        cos * PESO_COSINE
        - ham * PESO_HAMMING
        - penalidade
        + mod_clinico
    )

    return {
        "score_bruto":   round(score_bruto, 4),
        "cosine":        round(cos, 4),
        "hamming":       round(ham, 4),
        "penalidade":    round(penalidade, 4),
        "mod_clinico":   round(mod_clinico, 4),
    }


# =========================================================
# NORMALIZAÇÃO DO SCORE PARA EXIBIÇÃO
# =========================================================

def normalizar_scores(resultados: list[dict]) -> list[dict]:
    """
    Converte score_bruto para score_display em [0, 100] via min-max.
    """

    scores = [r["score_bruto"] for r in resultados]
    min_s  = min(scores)
    max_s  = max(scores)
    span   = max_s - min_s

    for r in resultados:
        if span == 0:
            r["score_display"] = 100.0
        else:
            r["score_display"] = round(
                (r["score_bruto"] - min_s) / span * 100, 1
            )

    return resultados


# =========================================================
# EXPLICAÇÃO DO MATCH
# =========================================================

def explicar_match(paciente: dict, profissional: dict) -> list[str]:
    explicacoes = []

    # Motivo (multi-label)
    if paciente["motivo_terapia"] != 5:
        idx = paciente["motivo_terapia"]
        if profissional["motivos_terapia"][idx] == 1:
            explicacoes.append(
                f"Foco clínico compatível: {MOTIVOS[idx]}"
            )

    # Abordagem
    if (
        paciente["abordagem"] != 5
        and profissional["abordagem"] != 6
        and paciente["abordagem"] == profissional["abordagem"]
    ):
        explicacoes.append(
            f"Abordagem compatível: {ABORDAGENS[paciente['abordagem']]}"
        )

    # Estilo (postura)
    if (
        paciente["estilo_terapeutico"] != 4
        and paciente["estilo_terapeutico"] == profissional["estilo_terapeutico"]
    ):
        explicacoes.append(
            f"Postura terapêutica alinhada: {ESTILOS[paciente['estilo_terapeutico']]}"
        )

    # Objetivo (resultado)
    if (
        paciente["objetivo"] != 3
        and paciente["objetivo"] == profissional["objetivo"]
    ):
        explicacoes.append(
            f"Objetivo em comum: {OBJETIVOS[paciente['objetivo']]}"
        )

    # Contextos
    if not paciente.get("ignora_contextos", False):
        indices_em_comum = np.where(
            (paciente["contextos"] == 1) & (profissional["contextos"] == 1)
        )[0]
        for i in indices_em_comum:
            explicacoes.append(
                f"Especialidade em comum: {CONTEXTOS_LABELS[i]}"
            )

    # Nota clínica contextual
    tempo_busca      = paciente.get("tempo_busca", 3)
    experiencia_prev = paciente.get("experiencia_previa", 1)
    estilo_prof      = profissional["estilo_terapeutico"]

    if tempo_busca == 0 and experiencia_prev == 0 and estilo_prof in (2, 3):
        explicacoes.append(
            "Perfil acolhedor recomendado para quem está começando agora"
        )

    if experiencia_prev == 2 and estilo_prof == 2:
        explicacoes.append(
            "Estilo acolhedor indicado para quem teve dificuldade de adaptação anterior"
        )

    # Suporte fora das sessões
    if (
        paciente.get("precisa_suporte_fora") == True
        and profissional["suporte_fora"] == 0
    ):
        explicacoes.append(
            "Oferece suporte por mensagens entre as sessões"
        )

    return explicacoes


# =========================================================
# RECOMENDAÇÃO
# =========================================================

def recomendar(
    paciente_payload: dict,
    profissionais_payload: list[dict]
) -> list[dict]:
    """
    Pipeline completo:
    1. Normalização dos payloads recebidos do back (list → np.ndarray)
    2. Filtros hard (logísticos)
    3. Score híbrido por candidato
    4. Ordenação
    5. Normalização do score para exibição

    Aceita os contratos PatientPayload e ProfessionalPayload diretamente,
    com contextos e motivos_terapia como list[int].
    O campo `id` do profissional é preservado na saída.
    """

    # 1. Normalização de entrada
    paciente      = normalizar_paciente(paciente_payload)
    profissionais = [normalizar_profissional(p) for p in profissionais_payload]

    # 2. Filtros hard
    candidatos = aplicar_filtros_hard(paciente, profissionais)

    if not candidatos:
        print("[AVISO] Nenhum profissional passou pelos filtros hard.")
        candidatos = profissionais  # fallback: usa todos

    # 3. Score
    resultados = []

    for profissional in candidatos:
        scores      = calcular_score(paciente, profissional)
        explicacoes = explicar_match(paciente, profissional)

        resultados.append({
            "profissional": profissional,
            "explicacoes":  explicacoes,
            **scores,
        })

    # 4. Ordenação e corte
    resultados.sort(key=lambda x: x["score_bruto"], reverse=True)
    resultados = resultados[:TOP_N]

    # 5. Normalização para exibição
    resultados = normalizar_scores(resultados)

    return resultados


# =========================================================
# GERAÇÃO DE DADOS FICTÍCIOS (para teste)
# =========================================================

def gerar_contextos() -> list[int]:
    # Retorna list[int] para simular o contrato do back
    return [random.randint(0, 1) for _ in CONTEXTOS_LABELS]


def gerar_paciente() -> dict:
    return {
        "motivo_terapia":     random.randint(0, 5),
        "abordagem":          random.randint(0, 5),
        "estilo_terapeutico": random.randint(0, 4),
        "objetivo":           random.randint(0, 3),
        "genero":             random.randint(0, 4),
        "experiencia":        random.randint(0, 4),
        "contextos":          gerar_contextos(),       # list[int] — contrato
        "ignora_contextos":   random.choice([True, False]),
        "tempo_busca":        random.randint(0, 3),
        "experiencia_previa": random.randint(0, 2),
        "precisa_suporte_fora": random.choice([True, False]),
        "restricao_horario":    random.choice([True, False]),
    }


def gerar_profissional(id_: str) -> dict:
    return {
        "id":                id_,                       # campo do contrato
        "motivos_terapia":   gerar_contextos(),         # list[int] — contrato
        "abordagem":         random.randint(0, 6),
        "estilo_terapeutico": random.randint(0, 3),
        "objetivo":          random.randint(0, 2),
        "genero":            random.randint(0, 2),
        "experiencia":       random.randint(0, 2),
        "contextos":         gerar_contextos(),         # list[int] — contrato
        "suporte_fora":      random.randint(0, 2),
        "periodo_atendimento": random.randint(0, 2),
    }


# =========================================================
# TESTE
# =========================================================

def main():

    random.seed(42)
    np.random.seed(42)

    paciente_payload      = gerar_paciente()
    profissionais_payload = [gerar_profissional(f"prof_{i:03d}") for i in range(50)]

    # --- Exibe perfil do paciente (usando payload bruto) ---
    print("=" * 60)
    print("PERFIL DO PACIENTE")
    print("=" * 60)
    print(f"  Motivo            : {MOTIVOS[paciente_payload['motivo_terapia']]}")
    print(f"  Abordagem         : {ABORDAGENS[paciente_payload['abordagem']]}")
    print(f"  Estilo esperado   : {ESTILOS[paciente_payload['estilo_terapeutico']]}")
    print(f"  Objetivo          : {OBJETIVOS[paciente_payload['objetivo']]}")
    print(f"  Gênero preferido  : {GENEROS_PACIENTE[paciente_payload['genero']]}")
    print(f"  Experiência prof. : {EXPERIENCIA_PACIENTE[paciente_payload['experiencia']]}")
    print(f"  Tempo buscando    : {TEMPO_BUSCA[paciente_payload['tempo_busca']]}")
    print(f"  Exp. prévia       : {EXPERIENCIA_PREVIA[paciente_payload['experiencia_previa']]}")
    print(f"  Suporte fora      : {'Sim' if paciente_payload['precisa_suporte_fora'] else 'Não'}")
    print(f"  Restrição horário : {'Sim' if paciente_payload['restricao_horario'] else 'Não'}")

    contextos_pac = [
        CONTEXTOS_LABELS[i]
        for i, v in enumerate(paciente_payload["contextos"])
        if v == 1
    ]
    print(f"  Contextos         : {contextos_pac or '(nenhum)'}")
    print(f"  Ignora contextos  : {paciente_payload['ignora_contextos']}")

    # --- Recomendações ---
    recomendados = recomendar(paciente_payload, profissionais_payload)

    print("\n")
    print("=" * 60)
    print(f"TOP {TOP_N} RECOMENDAÇÕES")
    print("=" * 60)

    for i, r in enumerate(recomendados, start=1):

        prof = r["profissional"]

        print(f"\n{'─' * 55}")
        print(
            f"  #{i}  ID: {prof['id']}   "
            f"Match: {r['score_display']:.1f}/100   "
            f"(score bruto: {r['score_bruto']:.4f})"
        )
        print(f"{'─' * 55}")
        print(f"  Cosine similarity : {r['cosine']:.4f}")
        print(f"  Hamming (norm.)   : {r['hamming']:.4f}")
        print(f"  Penalidades       : {r['penalidade']:.4f}")
        print(f"  Mod. clínico      : {r['mod_clinico']:.4f}")

        motivos_prof = [
            MOTIVOS[j]
            for j, v in enumerate(prof["motivos_terapia"])
            if v == 1
        ]
        print(f"\n  Perfil do profissional:")
        print(f"    Motivos      : {motivos_prof or '(nenhum)'}")
        print(f"    Abordagem    : {ABORDAGENS[prof['abordagem']]}")
        print(f"    Estilo       : {ESTILOS[prof['estilo_terapeutico']]}")
        print(f"    Objetivo     : {OBJETIVOS[prof['objetivo']]}")
        print(f"    Gênero       : {GENEROS_PROFISSIONAL[prof['genero']]}")
        print(f"    Experiência  : {EXPERIENCIA_PROFISSIONAL[prof['experiencia']]}")
        print(f"    Suporte fora : {SUPORTE_FORA[prof['suporte_fora']]}")
        print(f"    Período      : {PERIODO_ATENDIMENTO[prof['periodo_atendimento']]}")

        contextos_prof = [
            CONTEXTOS_LABELS[j]
            for j, v in enumerate(prof["contextos"])
            if v == 1
        ]
        print(f"    Contextos    : {contextos_prof or '(nenhum)'}")

        if r["explicacoes"]:
            print(f"\n  ✔ Motivos do match:")
            for exp in r["explicacoes"]:
                print(f"      • {exp}")
        else:
            print(
                f"\n  (sem compatibilidades diretas — "
                f"match por similaridade global)"
            )

    print(f"\n{'=' * 60}")
    print(
        f"Nota: score_display normalizado sobre os top {TOP_N} "
        f"candidatos (100 = melhor match do conjunto)."
    )
    print("=" * 60)


if __name__ == "__main__":
    main()
