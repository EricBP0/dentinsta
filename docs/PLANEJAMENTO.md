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
| Conteúdo | Produzido e publicado pelo sócio dentista, **100% via backoffice** |
| Disciplinas | **Dinâmicas** — criadas e publicadas pelo backoffice, sem depender de dev |
| Monetização | **Pagamento único**, parcelável em **até 12x de R$ 32,90** |
| Gateway | **Stripe** (cartão parcelado, Pix, boleto) |
| Certificado | Emitido ao concluir **100% dos itens marcados como obrigatórios** |
| Escopo do MVP | Inclui vídeos, mapas mentais, flashcards e certificados |

---

## 2. Conteúdo dinâmico (disciplinas)

Nada de conteúdo fica "no código". Tudo é cadastro no banco, gerenciado pelo
backoffice. O sócio cria, organiza, publica e atualiza sem precisar de desenvolvedor.

### 2.1 Estrutura

```
Disciplina            (ex.: Endodontia)
 └── Módulo           (ex.: Anatomia interna e acesso)
      └── Item        (ordem livre, arrastar e soltar)
           ├── Videoaula
           ├── Resumo
           ├── Mapa mental
           ├── Deck de flashcards
           └── Prova / lista de questões
```

Cada **item** tem:
- **tipo** (vídeo, resumo, mapa mental, flashcards, prova)
- **ordem** dentro do módulo
- **obrigatório: sim/não** → base para o certificado
- **status** próprio (rascunho / publicado)

### 2.2 Ciclo de vida da disciplina

| Status | O que o aluno vê |
|---|---|
| **Rascunho** | Nada. Só o backoffice enxerga. |
| **Em breve** | Card no catálogo com capa e descrição, sem acesso ao conteúdo. Gera expectativa. |
| **Publicada** | Disponível para todos os alunos com acesso ativo. |
| **Arquivada** | Some do catálogo; quem já tem progresso/certificado mantém o histórico. |

- **Agendamento**: publicar em data/hora futura (ex.: liberar antes da época de provas).
- **Pré-visualizar como aluno**: o sócio vê exatamente como vai ficar antes de publicar.
- **Publicação incremental**: dá para publicar a disciplina com 3 módulos e ir
  liberando os seguintes. Itens em rascunho dentro de uma disciplina publicada
  ficam invisíveis.
- **Notificação**: ao publicar disciplina/módulo novo, e-mail e aviso no dashboard
  ("Nova disciplina: Periodontia").

### 2.3 Metadados da disciplina (configuráveis)
Nome, descrição, capa, período sugerido (1º–10º), carga horária do certificado,
professor responsável, tags/temas (usados pela IA para montar simulados).

---

## 3. Certificados

### 3.1 Regra
O certificado de uma disciplina é emitido **automaticamente** quando o aluno
conclui **100% dos itens marcados como obrigatórios** naquela disciplina.

Exemplo: disciplina com 8 videoaulas, 3 mapas mentais e 4 decks de flashcards.
Se só as 8 videoaulas forem obrigatórias, assistir às 8 já emite o certificado.

### 3.2 O que conta como "concluído" por tipo de item

| Tipo | Critério de conclusão (sugestão) |
|---|---|
| Videoaula | Assistiu ≥ 90% do vídeo |
| Resumo | Rolou até o fim **ou** clicou em "marcar como lido" |
| Mapa mental | Abriu e clicou em "marcar como visto" |
| Flashcards | Revisou todos os cards do deck pelo menos 1 vez |
| Prova | Enviou a prova (opcional no backoffice: **nota mínima**, ex. 7,0) |

### 3.3 Regras de borda
- **Item obrigatório adicionado depois**: quem **já recebeu** o certificado
  mantém. Quem ainda não recebeu precisa concluir o novo item também.
- **Item obrigatório removido/arquivado**: deixa de contar; o sistema reavalia e
  pode emitir o certificado de quem ficou 100%.
- A barra de progresso do aluno mostra **"X de Y itens obrigatórios"**, para ficar
  claro o que falta.

### 3.4 O certificado
- PDF com nome do aluno, disciplina, carga horária, data, assinatura do responsável
  e **código + QR de validação**.
- Página pública de validação: `/certificado/{codigo}`.
- Texto informando que é **certificado de curso livre**.

---

## 4. Pagamento (Stripe)

### 4.1 Oferta
- **Um único produto**: acesso à plataforma.
- **Até 12x de R$ 32,90** no cartão (total R$ 394,80).
- **À vista (Pix ou cartão 1x) com desconto** — valor a definir.

### 4.2 Implementação
- **Stripe Checkout** (página de pagamento hospedada pela Stripe — menos código,
  menos responsabilidade com dados de cartão).
- Meios: **cartão com parcelamento** (installments, disponível para contas Stripe
  no Brasil), **Pix** e, opcionalmente, **boleto**.
- **Webhook** `checkout.session.completed` / `payment_intent.succeeded` → libera o
  acesso automaticamente. Reembolso/chargeback → revoga o acesso.
- Cupons de desconto via Stripe (úteis para parcerias com ligas acadêmicas).

### 4.3 Pontos a verificar com a Stripe antes de fechar
- Taxas do parcelamento e **quem absorve os juros** (parcelado "sem juros" para o
  aluno significa que a taxa sai da margem de vocês) e **prazo de recebimento**
  das parcelas.
- Taxa do Pix e do boleto.
- Emissão de nota fiscal: a Stripe **não** emite NF-e/NFS-e no Brasil — será
  preciso uma integração à parte (ex.: eNotas, NFE.io, Focus NFe).

---

## 5. Escopo do MVP

### 5.1 Área do aluno
- **Cadastro / login** (e-mail + senha, login com Google).
- **Catálogo dinâmico** por disciplina e período, com cards "Em breve".
- **Player de conteúdo** por item: vídeo (protegido + marca d'água com e-mail do
  aluno), resumo, mapa mental (zoom), flashcards, provas.
- **Provas / Simulados**
  - Banco de questões por disciplina (objetivas e discursivas).
  - **Gerador de simulado com IA**: disciplina, temas, nº de questões, dificuldade,
    "estilo da universidade".
  - **Correção com IA**: nota + anotações por questão, baseada em gabarito e rubrica.
    Botão **"contestar correção"**.
- **Flashcards** com repetição espaçada (SM-2 ou FSRS).
- **Certificados** (seção 3).
- **Dashboard**: média de notas (7/30 dias), horas estudadas, sequência de dias,
  flashcards para revisar hoje, progresso por disciplina ("X de Y obrigatórios"),
  certificados obtidos.

### 5.2 Backoffice (sócio + admin)
- **Conteúdo**: CRUD de disciplinas/módulos/itens, arrastar e soltar para ordenar,
  marcar obrigatório, status, agendamento, pré-visualização como aluno.
- Upload de vídeo (direto para o provedor de vídeo), resumo, mapa mental.
- **Importação em lote** de questões/flashcards via planilha (CSV).
- **Revisão de conteúdo gerado por IA** (fica em rascunho até aprovação).
- **Alunos e vendas**: lista de alunos, pagamentos (espelho da Stripe), status do acesso,
  liberar/revogar acesso manualmente.
- **Feedback**: contestações de correção, avaliações de aulas, mensagens.
- **Certificados**: modelo, assinatura, carga horária, lista de emitidos.
- **Papéis**: `admin` (tudo) e `professor` (só conteúdo e feedback).

### 5.3 Fora do MVP (fase 2+)
- Programa de afiliados (Stripe não tem nativo — construir ou usar ferramenta
  externa como Rewardful/FirstPromoter)
- Tutor de IA para tirar dúvidas (RAG sobre o conteúdo)
- App mobile nativo (MVP é web responsivo / PWA)
- Casos clínicos interativos com imagens
- Comunidade / fórum
- Gamificação avançada (ranking, conquistas)

---

## 6. IA — como funciona

### 6.1 Gerador de simulados
1. Base: banco de questões **próprias** (escritas/revisadas pelo sócio) + provas de
   universidades usadas **como referência de temas e estilo** (não copiar
   enunciados — risco de direito autoral).
2. A IA recebe: disciplina, temas, dificuldade, exemplos de estilo → gera questões novas.
3. No MVP: **simulados montados majoritariamente do banco revisado**; questões
   geradas por IA entram após aprovação no backoffice.

### 6.2 Correção
- **Objetivas**: correção automática (sem IA).
- **Discursivas**: IA compara com **gabarito + rubrica** e devolve nota por critério,
  anotações no texto do aluno e o que faltou citar.
- Toda correção pode ser **contestada** → backoffice → melhora rubrica/prompt.

### 6.3 Custos
- Limite de simulados/correções por dia por aluno.
- Reaproveitar questões geradas e aprovadas entre alunos.

---

## 7. Arquitetura sugerida

| Camada | Sugestão | Por quê |
|---|---|---|
| Front + back | **Next.js (TypeScript)** | Site de vendas, área do aluno e backoffice num só projeto; SEO |
| Banco + Auth + Storage | **Supabase** (Postgres) | Auth pronto, relacional, storage para PDFs/imagens |
| Vídeo | **Panda Video** (ou Vimeo) | Player protegido, marca d'água, CDN no Brasil, upload via API |
| IA | **API da Anthropic (Claude)** | Geração e correção de questões em português |
| Pagamento | **Stripe** (Checkout + Webhooks) | Parcelamento, Pix, boleto |
| Nota fiscal | eNotas / NFE.io / Focus NFe | Stripe não emite NF no Brasil |
| PDF de certificado | Geração server-side (ex.: `@react-pdf/renderer`) | |
| Hospedagem | Vercel + Supabase | Custo baixo no início |
| E-mail | Resend | Boas-vindas, senha, lembrete de revisão, novidades |

---

## 8. Modelo de dados inicial

```
usuarios (id, nome, email, universidade, periodo, papel[aluno|professor|admin], criado_em)

-- Conteúdo dinâmico
disciplinas (id, slug, nome, descricao, capa_url, periodo_sugerido, carga_horaria_h,
             status[rascunho|em_breve|publicada|arquivada], publicar_em, ordem, criado_por)
modulos     (id, disciplina_id, titulo, ordem, status, publicar_em)
itens       (id, modulo_id, tipo[video|resumo|mapa_mental|flashcards|prova], titulo, ordem,
             obrigatorio bool, status[rascunho|publicado], config_json)
  -- config_json por tipo:
  --   video:       { video_id, duracao_seg }
  --   resumo:      { conteudo_md, pdf_url }
  --   mapa_mental: { imagem_url }
  --   flashcards:  { }                         (cards na tabela flashcards)
  --   prova:       { nota_minima?, qtd_questoes }

-- Acesso e pagamento
compras  (id, usuario_id, stripe_checkout_id, stripe_payment_intent_id, metodo[cartao|pix|boleto],
          parcelas, valor_total, status[pendente|pago|reembolsado|contestado], criado_em)
acessos  (usuario_id, inicio, fim?, origem[compra|manual|cortesia], compra_id?)

-- Progresso
progresso_item (usuario_id, item_id, percentual, concluido, concluido_em, atualizado_em)
sessoes_estudo (usuario_id, item_id?, inicio, fim, tipo)

-- Questões e provas
questoes (id, disciplina_id, item_id?, tema, tipo[objetiva|discursiva], enunciado,
          alternativas_json, gabarito, rubrica_json, dificuldade,
          origem[professor|ia], status[rascunho|aprovada])
simulados (id, usuario_id, disciplina_id, item_id?, config_json, nota, criado_em)
simulado_questoes (simulado_id, questao_id, ordem)
respostas (id, simulado_id, questao_id, resposta, nota, feedback_json, corrigido_por[auto|ia|professor])
contestacoes (id, resposta_id, motivo, status, resposta_admin)

-- Flashcards
flashcards (id, item_id, frente, verso, imagem_url, origem, status)
flashcard_revisoes (usuario_id, flashcard_id, facilidade, intervalo_dias, repeticoes, proxima_revisao)

-- Certificados
certificados (id, usuario_id, disciplina_id, codigo_validacao, carga_horaria_h, emitido_em, pdf_url)

feedbacks (id, usuario_id, item_id?, tipo, mensagem, nota, criado_em)
```

**Cálculo do certificado** (roda sempre que um item é concluído ou quando o
backoffice altera itens obrigatórios):

```
obrigatorios = itens publicados e obrigatórios da disciplina
concluidos   = progresso_item concluído do aluno nesses itens
se concluidos == obrigatorios e não existe certificado → emite
```

---

## 9. Roadmap sugerido

| Etapa | Entregas | Estimativa* |
|---|---|---|
| 0. Fundação | Projeto, auth, layout, modelo de dados, papéis | 2–3 semanas |
| 1. Backoffice de conteúdo | Disciplinas/módulos/itens dinâmicos, status, agendamento, uploads | 2–3 semanas |
| 2. Área do aluno | Catálogo, player de itens, progresso, resumo, mapa mental | 2–3 semanas |
| 3. Prática | Questões, simulados, correção objetiva + IA, contestação | 3–4 semanas |
| 4. Retenção | Flashcards com repetição espaçada, dashboard, streak | 2–3 semanas |
| 5. Venda e certificado | Stripe (parcelado/Pix), liberação de acesso, NF, certificados, landing page | 2–3 semanas |
| 6. Beta | Turma piloto (1–2 faculdades), ajustes | 2–4 semanas |

\* Para 1–2 devs em tempo integral. **O backoffice vem cedo de propósito**: assim o
sócio já começa a cadastrar conteúdo real enquanto o resto é desenvolvido.

### Conteúdo mínimo para lançar
- 2–3 disciplinas completas
- Por disciplina: vídeos, resumos, 1 mapa mental por módulo, ~100 flashcards,
  ~150 questões com gabarito (e rubrica nas discursivas)

---

## 10. Pendências de decisão

- [ ] **Nome e domínio**
- [ ] **Validade do acesso**: vitalício ou 12 meses? (ver nota abaixo)
- [ ] **O pagamento único inclui disciplinas lançadas no futuro?**
- [ ] **Preço à vista** (com desconto sobre R$ 394,80)
- [ ] Parcelado com ou sem juros para o aluno
- [ ] Nota mínima padrão para provas obrigatórias (ou só exigir envio)
- [ ] **Disciplinas do lançamento**
- [ ] Ferramenta para os mapas mentais (Xmind, Whimsical, Canva…)
- [ ] Termos de uso e política de privacidade (LGPD)

> **Nota sobre validade do acesso:** com pagamento único e conteúdo sendo
> adicionado continuamente, acesso **vitalício a tudo** gera custo recorrente
> (vídeo, IA, servidor) sem receita recorrente. Sugestão: **acesso de 12 meses a
> todas as disciplinas publicadas no período** (casa com o 12x) e renovação com
> desconto — ou vitalício ao conteúdo, mas com a IA (simulados/correção) limitada
> a 12 meses.

---

## 11. Riscos e cuidados
- **Direito autoral** de provas de universidades → usar como referência, não copiar.
- **Erros da IA** em conteúdo de saúde → rubrica do professor, revisão humana,
  botão de contestação.
- **Pirataria** → player protegido, marca d'água, limite de sessões simultâneas.
- **Certificado** → deixar claro que é curso livre (não é reconhecido pelo MEC).
- **LGPD** → consentimento, exclusão de conta, dados de desempenho protegidos.
- **Nota fiscal** → Stripe não emite; integrar emissor desde o lançamento.
