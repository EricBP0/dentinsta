# Plataforma de Estudos para Odontologia — Planejamento do MVP

> Nome: **OdontoLab**. Identidade visual em [MARCA.md](MARCA.md).

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
| Monetização | **Pagamento único**: R$ 297,90 à vista ou **12x de R$ 32,90 sem juros** (R$ 394,80, taxas embutidas) |
| Acesso | **Vitalício** ao que foi publicado até 12 meses após a compra; **novidades e IA por 12 meses** |
| Após a janela | Conteúdo novo aparece com cadeado **"Renove para liberar"** |
| Cota de IA | **60 correções discursivas/mês** por aluno |
| Gateway | **Asaas** (Pix, cartão à vista e parcelado em até 12x, todas as bandeiras, NFS-e automática) |
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

## 4. Pagamento (Asaas)

> **Atualização: o modelo virou assinatura** (migration 0014). Anual em 12x sem
> juros (ou à vista no Pix pelo mesmo total) / mensal: Essencial 12x R$ 14,90 /
> R$ 22,90 (anual só com Disciplinas; no mensal somam-se os avulsos Simulados
> R$ 22,90, Flashcards R$ 14,90, Chat IA R$ 26,90, Consultório R$ 14,90),
> Completo 12x R$ 34,90 / R$ 49,90 e Duplo 12x R$ 59,90 / R$ 79,90 (duas
> pessoas). Mensal é recorrente no cartão; anual é pagamento único. O acesso vale enquanto a
> assinatura estiver paga (+3 dias de tolerância). As seções 4.1 a 4.1.2 abaixo
> descrevem o modelo antigo (compra única com 12 meses de novidades) e ficam
> como histórico. Preços: `src/lib/planos.ts`.

> Trocado da Stripe para o Asaas: a Stripe não oferece parcelamento de cartão para
> contas brasileiras nem aceita Elo/Hipercard. O Asaas parcela, aceita todas as
> bandeiras e emite nota fiscal de serviço automaticamente.

### 4.1 Oferta
- **Um único produto**: acesso à plataforma.
- **À vista (Pix ou cartão 1x): R$ 297,90** ← preço real do produto
- **Parcelado: 12x de R$ 32,90 sem juros** no cartão (total R$ 394,80)

A diferença (R$ 96,90, ~32,5%) cobre as taxas do parcelamento e da antecipação.
Para o aluno, a comunicação é **"à vista com desconto"**. Cobrar preços diferentes
por forma de pagamento é permitido (Lei 13.455/2017), desde que os dois preços
estejam claros na página de venda.

**Como fica no Asaas:** cada checkout cobra um valor fixo, então a escolha
acontece **na nossa página de pagamento (/assinar), antes do checkout**:

| Botão na página | Checkout do Asaas |
|---|---|
| "À vista R$ 297,90" | valor 297,90 · Pix + cartão · cobrança avulsa |
| "12x de R$ 32,90" | valor 394,80 · só cartão · parcelamento de até 12x |

O checkout do Asaas define o **máximo** de parcelas; o aluno do parcelado pode
escolher menos parcelas, pagando os mesmos R$ 394,80. Conferir as taxas de
parcelamento/antecipação no Asaas para garantir que a diferença cobre os custos.

### 4.1.1 Regra de acesso

A partir da data do pagamento (`compra_em`), o aluno tem uma janela de
**12 meses** (`novidades_ate = compra_em + 12 meses`):

| | Durante os 12 meses | Depois dos 12 meses |
|---|---|---|
| Conteúdo publicado **até** `novidades_ate` | ✅ | ✅ **vitalício** |
| Conteúdo publicado **depois** de `novidades_ate` | — | 🔒 aparece com cadeado **"Renove para liberar"** |
| IA (gerar simulados, correção discursiva) | ✅ | ❌ |
| Flashcards, provas objetivas do banco, dashboard, certificados | ✅ | ✅ (não custam IA) |

- A regra vale **por item**, usando a data da **primeira publicação**
  (`primeira_publicacao_em`). Assim: disciplina antiga que ganhou um módulo novo
  depois da janela → o aluno vê a disciplina, mas não o módulo novo.
- **Correções/edições** de um item que o aluno já tinha **continuam visíveis**
  (não mudam `primeira_publicacao_em`).
- **Certificado depois da janela**: calculado só sobre os itens obrigatórios que
  o aluno enxerga — senão ele nunca conseguiria completar.
- **Renovação**: oferta "Renove novidades + IA por mais 12 meses" com preço
  menor — vira receita recorrente sem mudar o modelo de venda.

### 4.1.2 "Renove para liberar" (vitrine)

Conteúdo publicado depois da janela **aparece**, mas bloqueado — funciona como
vitrine para a renovação.

- **Catálogo**: disciplina nova aparece com selo **🔒 Novo** e botão "Renove para liberar".
- **Dentro de disciplina que o aluno já tem**: módulos/itens novos aparecem na
  lista com cadeado, título visível e conteúdo bloqueado.
- **IA**: botões de gerar simulado / enviar discursiva mostram "Renove para usar a IA".
- **Contador** no dashboard: "12 novas aulas e 2 disciplinas desde o seu acesso".
- Clique em qualquer cadeado → página de renovação (checkout do Asaas).
- **Avisos antes do fim da janela**: e-mail e banner 30 dias e 7 dias antes.
- Itens bloqueados **não contam** para o certificado (seção 3).

### 4.2 Implementação (feita)
- **Checkout do Asaas** (página de pagamento hospedada — menos código e nenhum
  dado de cartão passa pelo nosso servidor). Pix e cartão; o checkout do Asaas
  não oferece boleto.
- **Webhook** `CHECKOUT_PAID` → libera o acesso (ou soma 12 meses na renovação).
  `PAYMENT_REFUNDED` / `PAYMENT_CHARGEBACK_REQUESTED` → desfaz os 12 meses dessa
  compra (sem nenhuma compra paga, o acesso é removido). `CHECKOUT_EXPIRED` /
  `CHECKOUT_CANCELED` → encerra a compra pendente. Tudo idempotente.
- Backoffice **Vendas** (só admin): pagamentos, vendas do mês, busca de alunos,
  liberação manual (cortesia) e revogação.

### 4.3 Pontos a verificar no Asaas antes de lançar
- Taxas do cartão parcelado e da antecipação, e **prazo de recebimento**.
- Taxa do Pix.
- **Nota fiscal**: configurar a emissão automática de NFS-e no painel do Asaas
  (dados da empresa, código de serviço do município).

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
- **Alunos e vendas**: lista de alunos, pagamentos (espelho do Asaas), status do acesso,
  liberar/revogar acesso manualmente.
- **Feedback**: contestações de correção, avaliações de aulas, mensagens.
- **Certificados**: modelo, assinatura, carga horária, lista de emitidos.
- **Papéis**: `admin` (tudo) e `professor` (só conteúdo e feedback).

### 5.3 Fora do MVP (fase 2+)
- Programa de afiliados (o Asaas permite dividir o pagamento — split — com a
  carteira do afiliado; falta a parte de links e comissões)
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

### 6.3 Estratégia para a IA custar pouco

A regra de ouro: **só chamar a IA quando não há outro jeito**, e nunca em tempo real
para algo que pode ser feito uma vez e reaproveitado por todos os alunos.

| Funcionalidade | Usa IA em tempo real? | Como |
|---|---|---|
| Montar simulado | **Não** | Seleção inteligente do banco (tema, dificuldade, questões que o aluno errou, que ainda não viu). Custo zero. |
| Gerar questões novas | **Não** (lote) | Feito no backoffice pelo sócio, via **Batch API (50% mais barato)**, revisado e salvo no banco. Custo único, usado por todos. |
| Corrigir objetivas | **Não** | Comparação com gabarito. Custo zero. |
| Corrigir discursivas | **Sim** | Única chamada em tempo real. Ver otimizações abaixo. |
| Flashcards a partir dos erros (fase 2) | **Não** (lote) | Gerados em lote à noite, via Batch API. |

**Otimizações na correção discursiva:**
- **Prompt caching**: instruções + rubrica da questão ficam num prefixo fixo
  cacheado; só a resposta do aluno muda. Leitura de cache custa uma fração do preço normal.
- **Resposta curta e estruturada** (JSON: nota por critério + 2–4 comentários),
  com `max_tokens` controlado.
- **Limite de tamanho** da resposta do aluno (ex.: 1.500 caracteres).
- **Modelo certo para a tarefa**: testar a correção num lote de ~50 respostas reais
  corrigidas pelo sócio, comparando modelos maiores e menores (e níveis de
  "effort"). Ficar com o mais barato que concorde com a nota do professor.
- **Não corrigir de novo** a mesma resposta (resultado salvo).
- **Cota por aluno: 60 correções discursivas/mês**, exibida no dashboard.
- **Painel de custo** no backoffice: gasto de IA por dia e por aluno, alerta se
  alguém fugir do padrão.

**Ordem de grandeza** (estimativa, a validar com medição real): uma correção
discursiva usa ~2.000 tokens de entrada e ~400 de saída. Com os preços de
setembro/2026 da API da Anthropic, isso fica entre **menos de US$ 0,01** (Haiku 4.5
/ Sonnet 5.5) e **~US$ 0,02–0,03** (Opus 5.5), antes do desconto do cache. Com cota de
60 correções/mês, o pior caso por aluno fica entre **~R$ 2 e R$ 10/mês**, e a maioria
dos alunos não usa a cota inteira.

### 6.4 Estratégia para o servidor custar pouco
- **Vídeo é o maior custo** — fica no provedor de vídeo (Panda), nunca no nosso servidor.
- **Páginas de catálogo e conteúdo em cache** (geração estática/ISR + CDN):
  o servidor só é chamado quando o conteúdo muda.
- **Progresso em lote**: o player envia o progresso a cada 30s, não a cada segundo.
- **Flashcards calculados no navegador** e sincronizados ao fim da sessão.
- **PDFs gerados uma vez** (certificados) e guardados no storage.
- **Sem servidor sempre ligado**: Vercel (serverless) + Supabase. Custo inicial
  estimado de ~US$ 45/mês (planos pagos básicos), subindo só com o uso.
- Trabalhos pesados (lotes de IA, e-mails) em **fila/cron**, fora da requisição do aluno.

---

## 7. Arquitetura sugerida

| Camada | Sugestão | Por quê |
|---|---|---|
| Front + back | **Next.js (TypeScript)** | Site de vendas, área do aluno e backoffice num só projeto; SEO |
| Banco + Auth + Storage | **Supabase** (Postgres) | Auth pronto, relacional, storage para PDFs/imagens |
| Vídeo | **Panda Video** (ou Vimeo) | Player protegido, marca d'água, CDN no Brasil, upload via API |
| IA | **API da Anthropic (Claude)** | Geração e correção de questões em português |
| Pagamento | **Asaas** (Checkout + Webhooks) | Parcelamento, Pix, todas as bandeiras |
| Nota fiscal | Asaas (NFS-e automática) | Configurada no painel, sem código |
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
             obrigatorio bool, status[rascunho|publicado], primeira_publicacao_em, config_json)
  -- config_json por tipo:
  --   video:       { video_id, duracao_seg }
  --   resumo:      { conteudo_md, pdf_url }
  --   mapa_mental: { imagem_url }
  --   flashcards:  { }                         (cards na tabela flashcards)
  --   prova:       { nota_minima?, qtd_questoes }

-- Acesso e pagamento
compras  (id, usuario_id, tipo[compra|renovacao], modalidade[a_vista|parcelado], checkout_id,
          gateway_cliente_id, metodo[cartao|pix|boleto],
          parcelas, valor_total, status[pendente|pago|reembolsado|contestado], criado_em)
acessos  (usuario_id, compra_em, novidades_ate, ia_ate, origem[compra|renovacao|manual|cortesia], compra_id?)
  -- novidades_ate = ia_ate = compra_em + 12 meses (renovação estende as duas)

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

uso_ia (id, usuario_id, tipo[correcao|geracao_lote], modelo, tokens_entrada, tokens_saida,
        tokens_cache, custo_usd, criado_em)          -- cota por aluno e painel de custo
```

**Visibilidade de um item para o aluno:**

```
item publicado e item.primeira_publicacao_em <= acesso.novidades_ate
```

**Cálculo do certificado** (roda sempre que um item é concluído ou quando o
backoffice altera itens obrigatórios):

```
obrigatorios = itens publicados, obrigatórios e VISÍVEIS para o aluno
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
| 5. Venda e certificado | Asaas (parcelado/Pix), liberação de acesso, NF, certificados, landing page | 2–3 semanas |
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
- [ ] **Preço da renovação** (novidades + IA por mais 12 meses) — à vista e parcelado
- [ ] Conferir no Asaas: taxas do parcelamento/antecipação e configurar a NFS-e automática
- [ ] Nota mínima padrão para provas obrigatórias (ou só exigir envio)
- [ ] **Disciplinas do lançamento**
- [ ] Ferramenta para os mapas mentais (Xmind, Whimsical, Canva…)
- [ ] Termos de uso e política de privacidade (LGPD)

---

## 11. Riscos e cuidados
- **Direito autoral** de provas de universidades → usar como referência, não copiar.
- **Erros da IA** em conteúdo de saúde → rubrica do professor, revisão humana,
  botão de contestação.
- **Pirataria** → player protegido, marca d'água, limite de sessões simultâneas.
- **Certificado** → deixar claro que é curso livre (não é reconhecido pelo MEC).
- **LGPD** → consentimento, exclusão de conta, dados de desempenho protegidos.
- **Nota fiscal** → configurar a emissão automática de NFS-e no Asaas antes da primeira venda.
