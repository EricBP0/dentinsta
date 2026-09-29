# Plataforma de Estudos para Odontologia — Planejamento do MVP

> Nome provisório: **dentinsta** (a definir)

## 1. Visão geral

Plataforma de estudos para **estudantes de graduação em Odontologia**. O conteúdo é
produzido e curado por um cirurgião-dentista de referência (sócio). O diferencial
em relação a plataformas de cursos (ex.: DentistaOn) é a **IA focada em passar nas
provas da faculdade**: geração de simulados no estilo das universidades e correção
com nota e comentários.

### Decisões já tomadas
| Tema | Decisão |
|---|---|
| Público | Graduação em Odontologia |
| Conteúdo | Produzido e revisado pelo sócio dentista |
| Monetização | Venda (formato exato em definição — ver seção 7) |
| Escopo do MVP | Inclui vídeos, mapas mentais, flashcards e certificados |

---

## 2. Escopo do MVP

### 2.1 Área do aluno
- **Cadastro / login** (e-mail + senha, login com Google).
- **Catálogo organizado por disciplina e período** (ex.: "Endodontia — 5º período").
- **Módulo → Aulas**, cada aula pode ter:
  - **Videoaula** (player com proteção + marca d'água com e-mail do aluno)
  - **Resumo** (texto rico / PDF para leitura na plataforma)
  - **Mapa mental** (imagem/PDF em alta resolução com zoom)
  - **Flashcards** (repetição espaçada)
  - **Questões** da aula
- **Provas / Simulados**
  - Banco de questões por disciplina (objetivas e discursivas).
  - **Gerador de simulado com IA**: aluno escolhe disciplina, temas, nº de questões,
    dificuldade e "estilo da universidade".
  - **Correção com IA**: nota + anotações por questão, com base no gabarito e
    rubrica do professor. Botão **"contestar correção"**.
- **Flashcards**
  - Revisão diária com repetição espaçada (algoritmo SM-2 ou FSRS).
  - Cards criados pelo sócio + cards gerados pela IA a partir dos erros do aluno
    (fase 2, opcional).
- **Certificados**
  - Emitidos ao concluir um curso/módulo (critério: % de aulas + nota mínima na prova final).
  - PDF com nome, carga horária, data, assinatura do responsável e **código/QR de validação**.
  - Página pública de validação (`/certificado/{codigo}`).
  - Texto deixando claro que é **certificado de curso livre**.
- **Dashboard**
  - Média de notas nos últimos 7/30 dias
  - Horas estudadas (vídeo assistido + tempo em atividades)
  - Sequência de dias estudando (streak)
  - Flashcards para revisar hoje
  - Progresso por disciplina
  - Certificados obtidos

### 2.2 Backoffice (sócio + admin)
- **Gestão de conteúdo**: criar disciplinas, módulos, aulas; upload de vídeo,
  resumo, mapa mental; cadastro de flashcards e questões (com gabarito e rubrica).
- **Importação em lote** de questões/flashcards (planilha CSV) — economiza muito
  tempo do sócio.
- **Revisão de conteúdo gerado por IA** (questões/flashcards ficam "rascunho" até aprovação).
- **Cadastros e compras**: lista de alunos, o que cada um comprou, status.
- **Feedback**: contestações de correção, avaliações de aulas, mensagens.
- **Certificados**: modelo, assinatura, critérios de emissão.

### 2.3 Fora do MVP (fase 2+)
- Programa de afiliados próprio (no MVP, usar o da plataforma de pagamento, se houver)
- Tutor de IA para tirar dúvidas (RAG sobre o conteúdo)
- App mobile nativo (MVP é web responsivo / PWA)
- Casos clínicos interativos com imagens
- Comunidade / fórum
- Gamificação avançada (ranking, conquistas)

---

## 3. IA — como funciona

### 3.1 Gerador de simulados
1. Base: banco de questões **próprias** (escritas/revisadas pelo sócio) + provas de
   universidades usadas **como referência de temas e estilo** (não copiar
   enunciados — risco de direito autoral).
2. A IA recebe: disciplina, temas, dificuldade, exemplos de estilo → gera questões novas.
3. Estratégia recomendada no MVP: **montar simulados majoritariamente do banco
   revisado** e usar questões geradas por IA após aprovação no backoffice. Garante
   qualidade clínica.

### 3.2 Correção
- **Objetivas**: correção automática (sem IA).
- **Discursivas**: IA compara a resposta com **gabarito + rubrica** do professor e devolve:
  - nota por critério da rubrica
  - comentários/anotações no texto do aluno
  - o que faltou citar
- Toda correção pode ser **contestada** → vai para o backoffice → vira dado para
  melhorar rubrica/prompt.

### 3.3 Custos
- Cobrar por uso interno: limitar nº de simulados/correções por dia por aluno.
- Cache de questões geradas (reaproveitar entre alunos após aprovação).

---

## 4. Arquitetura sugerida

| Camada | Sugestão | Por quê |
|---|---|---|
| Front + back | **Next.js (TypeScript)** | Um só projeto para site, área do aluno e backoffice; SEO para as páginas de venda |
| Banco + Auth + Storage | **Supabase** (Postgres) | Auth pronto, banco relacional, storage para PDFs/imagens, rápido para MVP |
| Vídeo | **Panda Video** (ou Vimeo) | Player protegido, marca d'água, anti-download, CDN no Brasil |
| IA | **API da Anthropic (Claude)** | Geração e correção de questões em português com boa qualidade |
| Pagamento | **Hotmart / Kiwify** ou **Stripe / Pagar.me** | Ver seção 7 |
| PDF de certificado | Geração server-side (ex.: `@react-pdf/renderer`) | |
| Hospedagem | Vercel + Supabase | Custo baixo no início |
| E-mail | Resend | Boas-vindas, recuperação de senha, lembrete de revisão |

---

## 5. Modelo de dados inicial

```
usuarios (id, nome, email, universidade, periodo, papel[aluno|admin|professor], criado_em)

disciplinas (id, nome, periodo_sugerido, descricao, capa_url)
modulos (id, disciplina_id, titulo, ordem)
aulas (id, modulo_id, titulo, ordem, video_id, duracao_seg, resumo_md, resumo_pdf_url, mapa_mental_url)

produtos (id, nome, preco, tipo[disciplina|combo|acesso_total], validade_dias)
produto_itens (produto_id, disciplina_id)
compras (id, usuario_id, produto_id, status, gateway, gateway_ref, valor, criado_em)
acessos (usuario_id, disciplina_id, inicio, fim)          -- derivado das compras

progresso_aula (usuario_id, aula_id, segundos_assistidos, concluida, atualizado_em)
sessoes_estudo (usuario_id, inicio, fim, tipo[video|flashcard|prova|leitura])

questoes (id, disciplina_id, tema, tipo[objetiva|discursiva], enunciado, alternativas_json,
          gabarito, rubrica_json, dificuldade, origem[professor|ia], status[rascunho|aprovada])
simulados (id, usuario_id, disciplina_id, config_json, criado_em)
simulado_questoes (simulado_id, questao_id, ordem)
respostas (id, simulado_id, questao_id, resposta, nota, feedback_json, corrigido_por[auto|ia|professor])
contestacoes (id, resposta_id, motivo, status, resposta_admin)

flashcards (id, aula_id, frente, verso, imagem_url, origem, status)
flashcard_revisoes (usuario_id, flashcard_id, facilidade, intervalo_dias, repeticoes, proxima_revisao)

certificados (id, usuario_id, disciplina_id, codigo_validacao, carga_horaria, emitido_em, pdf_url)

feedbacks (id, usuario_id, aula_id?, tipo, mensagem, nota, criado_em)
```

`produtos` / `acessos` já suportam venda por disciplina, combos ou acesso total —
não é preciso decidir o modelo de venda antes de começar a desenvolver.

---

## 6. Roadmap sugerido

Como o MVP ficou maior, dividir em entregas internas (o aluno só vê o lançamento):

| Etapa | Entregas | Estimativa* |
|---|---|---|
| 0. Fundação | Projeto, auth, layout, modelo de dados, backoffice básico | 2–3 semanas |
| 1. Conteúdo | Disciplinas/módulos/aulas, vídeo, resumo, mapa mental, progresso | 3–4 semanas |
| 2. Prática | Banco de questões, simulados, correção objetiva + IA, contestação | 3–4 semanas |
| 3. Retenção | Flashcards com repetição espaçada, dashboard, streak | 2–3 semanas |
| 4. Venda | Checkout, liberação de acesso, certificados, landing page | 2–3 semanas |
| 5. Beta | Turma piloto (1–2 faculdades), ajustes | 2–4 semanas |

\* Estimativas para 1–2 devs em tempo integral. **O gargalo provável é a produção de
conteúdo, não o código**: o sócio deve começar a gravar/escrever em paralelo desde já.

### Conteúdo mínimo para lançar
- 2–3 disciplinas completas (sugestão: as de maior reprovação/procura — ex.:
  Anatomia, Endodontia, Periodontia)
- Por disciplina: vídeos, resumos, 1 mapa mental por módulo, ~100 flashcards,
  ~150 questões com gabarito (e rubrica nas discursivas)

---

## 7. Pendências de decisão

- [ ] **Nome e domínio**
- [ ] **Modelo de venda**: por disciplina, combo por período, acesso total anual?
      Acesso vitalício ou com validade?
- [ ] **Gateway**: Hotmart/Kiwify (afiliados prontos, taxa maior, menos controle)
      vs. Stripe/Pagar.me (taxa menor, afiliados precisa construir)
- [ ] **Critério do certificado** (% concluído + nota mínima?) e carga horária
- [ ] **Disciplinas do lançamento**
- [ ] Ferramenta que o sócio usará para fazer mapas mentais (Xmind, Whimsical, Canva…)
- [ ] Termos de uso e política de privacidade (LGPD)

---

## 8. Riscos e cuidados
- **Direito autoral** de provas de universidades → usar como referência, não copiar.
- **Erros da IA** em conteúdo de saúde → rubrica do professor, revisão humana,
  botão de contestação.
- **Pirataria** → player protegido, marca d'água, limite de sessões simultâneas por conta.
- **Certificado** → deixar claro que é curso livre (não é reconhecido pelo MEC).
- **LGPD** → consentimento, exclusão de conta, dados de desempenho protegidos.
