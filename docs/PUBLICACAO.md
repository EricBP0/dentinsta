# Roteiro de publicação (Vercel + Supabase + Asaas + Anthropic)

Passo a passo para colocar a plataforma no ar, testar de ponta a ponta com
pagamento de teste e depois virar a chave para vender de verdade.

> Os preços citados são referência. Confira os valores atuais em cada serviço
> antes de assinar.

---

## 0. Antes de começar

### Contas e planos

| Serviço | Para quê | Plano |
|---|---|---|
| **GitHub** | Código (repositório `dentinsta`) | Gratuito |
| **Vercel** | Hospedar o site | **Pro obrigatório**: o plano gratuito (Hobby) é só para uso pessoal e **proíbe uso comercial**, e a plataforma cobra dos alunos |
| **Supabase** | Banco de dados, login e arquivos | Comece no gratuito para testar. Para lançar, **Pro**: o gratuito pode pausar o projeto por inatividade e não tem backup diário |
| **Resend** (ou outro SMTP) | E-mails de confirmação de cadastro e de senha | Plano gratuito atende o começo |
| **Asaas** | Pagamentos (Pix, cartão, parcelado) e nota fiscal | Sem mensalidade; taxa por transação |
| **Anthropic** | IA (correção de discursivas e geração de questões e flashcards) | Pré-pago por uso |
| **Domínio** | Ex.: `dentinsta.com.br` (registro.br) | Anual |

### O código

Todo o trabalho está no branch `claude/nifty-euler-ywoua0`. Antes de publicar,
junte esse branch ao `main` (por um pull request no GitHub). A Vercel publica o
`main` como produção.

---

## 1. Supabase (banco, login e arquivos)

1. Crie o projeto em [supabase.com](https://supabase.com) → **New project**.
   - **Região: South America (São Paulo)** — fica perto dos alunos e da Vercel.
   - Guarde a senha do banco num gerenciador de senhas.
2. **SQL Editor** → rode os arquivos de `supabase/migrations/`, **um por vez e
   nesta ordem**, conferindo que cada um termina sem erro:
   1. `0001_base.sql`
   2. `0002_questoes_simulados.sql`
   3. `0003_geracao_questoes.sql` (cria o bucket privado `materiais` no Storage)
   4. `0004_flashcards.sql`
   5. `0005_pagamentos_asaas.sql`
   6. `0006_painel_aluno.sql`
   7. `0007_certificados.sql`
3. **Project Settings → API Keys**: anote a **URL do projeto**, a chave
   **publishable** e a chave **secret**. A secret nunca vai para o navegador nem
   para o GitHub — só para as variáveis da Vercel.
4. **Authentication → URL Configuration**:
   - **Site URL**: `https://SEU-DOMINIO` (enquanto não tiver domínio, use o
     endereço `https://....vercel.app` que a Vercel gerar no passo 4).
   - **Redirect URLs**: adicione `https://SEU-DOMINIO/auth/confirmar` (e o
     equivalente no endereço `.vercel.app`).
5. **Authentication → Emails → SMTP Settings**: configure o SMTP próprio
   (passo 2). **Sem isso o cadastro não funciona em produção**: o e-mail padrão
   do Supabase envia só 2 mensagens por hora e só para membros da equipe.
6. **Authentication → Emails → Templates** (recomendado): troque o link dos
   modelos para o formato abaixo. Assim o link funciona mesmo se o aluno abrir o
   e-mail no celular depois de se cadastrar no computador. Aproveite para
   traduzir os textos para português.
   - **Confirm signup**:
     `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email`
   - **Reset password**:
     `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`

   Se não trocar, os modelos padrão também funcionam, mas o link precisa ser
   aberto no mesmo navegador em que o aluno se cadastrou.

---

## 2. E-mail (Resend)

1. Crie a conta em [resend.com](https://resend.com) e adicione o seu domínio.
2. Cadastre no registro.br (ou onde o domínio estiver) os registros DNS que o
   Resend mostrar (SPF/DKIM). Espere o domínio ficar **verificado**.
3. Gere uma chave de API (SMTP) e preencha no Supabase (passo 1.5):
   - Host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a chave.
   - Remetente: por exemplo `nao-responda@SEU-DOMINIO`, nome `dentinsta`.

---

## 3. Anthropic (IA)

1. Crie a organização em [console.anthropic.com](https://console.anthropic.com),
   adicione créditos e gere a **API key**.
2. Em **Limits**, defina um **limite de gasto mensal** — protege contra surpresas
   enquanto vocês medem o custo real.
3. O consumo de cada correção e geração fica registrado na tabela `uso_ia` do
   Supabase, para acompanhar custo por aluno.

---

## 4. Vercel (site)

1. Em [vercel.com](https://vercel.com), assine o **Pro** e clique em
   **Add New → Project** → importe o repositório `dentinsta` do GitHub.
   A Vercel detecta Next.js sozinha; não mude os comandos de build.
2. Antes do primeiro deploy, abra **Environment Variables** e cadastre (em
   **Production** e **Preview**):

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable |
   | `SUPABASE_SECRET_KEY` | Chave secret (marque como **Sensitive**) |
   | `ANTHROPIC_API_KEY` | Chave da Anthropic (Sensitive) |
   | `ASAAS_API_KEY` | Chave do **sandbox** do Asaas por enquanto (Sensitive) |
   | `ASAAS_AMBIENTE` | `sandbox` |
   | `ASAAS_WEBHOOK_TOKEN` | Uma senha longa e aleatória que você inventa (Sensitive) |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` (ou o `.vercel.app` até ter domínio) |
   | `CERTIFICADO_RESPONSAVEL` | Nome de quem assina (ex.: `Dr. Fulano de Tal`) |
   | `CERTIFICADO_RESPONSAVEL_CARGO` | Ex.: `CRO-SP 12345 · Coordenador pedagógico` |

   Opcionais: `IA_MODELO`, `IA_EFFORT`, `IA_COTA_MENSAL`, `IA_MODELO_GERACAO`,
   `IA_EFFORT_GERACAO`, `PRECO_RENOVACAO_A_VISTA_CENTAVOS`,
   `PRECO_RENOVACAO_PARCELADO_CENTAVOS`, `CERTIFICADO_PLATAFORMA`.

3. Clique em **Deploy**. As funções rodam na região de São Paulo (`gru1`),
   definida no `vercel.json`.
4. **Domínio**: **Settings → Domains** → adicione o domínio e crie no
   registro.br os registros que a Vercel indicar.
5. Quando o domínio estiver ativo, confira se `NEXT_PUBLIC_SITE_URL` e a **Site
   URL** do Supabase usam o domínio final e faça **Redeploy**. Variáveis que
   começam com `NEXT_PUBLIC_` só mudam depois de um novo deploy.

---

## 5. Asaas (pagamentos) — primeiro no sandbox

1. Crie a conta de testes em [sandbox.asaas.com](https://sandbox.asaas.com) e
   gere a chave de API (**Integrações → Chaves de API**). Coloque em
   `ASAAS_API_KEY` na Vercel, com `ASAAS_AMBIENTE=sandbox`.
2. **Integrações → Webhooks → Adicionar**:
   - URL: `https://SEU-DOMINIO/api/asaas/webhook`
   - Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - Tipo de envio: sequencial
   - Eventos: `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`,
     `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`,
     `PAYMENT_CHARGEBACK_REQUESTED`
3. No sandbox, pague com os cartões de teste do Asaas ou confirme o Pix pelo
   próprio painel do sandbox.

---

## 6. Primeiro acesso

1. Abra o site, clique em **Entrar → Criar conta** e confirme o e-mail.
2. No Supabase (**SQL Editor**), transforme sua conta em admin:
   ```sql
   update perfis set papel = 'admin' where email = 'seu@email.com';
   ```
3. Seu sócio cria a conta dele e vira professor:
   ```sql
   update perfis set papel = 'professor' where email = 'email-do-socio@...';
   ```
   Professor gerencia conteúdo e contestações; só admin vê **Vendas**.

---

## 7. Teste de ponta a ponta (sandbox)

Marque cada item. Use uma conta de aluno separada (outro e-mail).

**Conta**
- [ ] Criar conta → chega o e-mail → o link confirma e entra na plataforma
- [ ] Sair → **Esqueci minha senha** → chega o e-mail → criar nova senha → entra

**Conteúdo (professor)**
- [ ] Criar disciplina, preencher **carga horária**, criar módulo e itens
      (vídeo do Panda, resumo, mapa mental, deck de flashcards) e marcar obrigatórios
- [ ] Gerar questões com IA a partir de uma apostila em PDF → aguardar em
      **Gerações** → revisar e aprovar
- [ ] Gerar flashcards com IA no deck → publicar
- [ ] Publicar a disciplina

**Compra (aluno)**
- [ ] Sem acesso, o catálogo pede para liberar
- [ ] **Assinar → à vista** → pagar Pix no sandbox → volta com "Pagamento
      confirmado" e o acesso aparece liberado
- [ ] Em **Vendas** (admin), o pagamento aparece como pago
- [ ] Repetir com **parcelado** (outra conta) usando cartão de teste

**Estudo (aluno)**
- [ ] Abrir as aulas e marcar como concluídas; o **Painel** mostra o progresso
- [ ] Fazer um simulado com objetivas e discursivas → as discursivas são
      corrigidas pela IA em até ~1 minuto
- [ ] Contestar uma correção → aparece em **Contestações** para o professor
- [ ] Estudar os flashcards; o tempo de estudo aparece no painel no dia
- [ ] Concluir os itens obrigatórios → **Certificados → Emitir** → baixar o
      PDF → ler o QR code no celular → a página de validação confirma

**Estorno**
- [ ] Estornar um pagamento no painel do Asaas → o acesso daquele aluno é
      retirado automaticamente

---

## 8. Virar para produção (vender de verdade)

1. Crie/ative a conta **real** do Asaas (envio de documentos da empresa) e
   gere a chave de produção.
2. Na Vercel: `ASAAS_API_KEY` = chave de produção, `ASAAS_AMBIENTE=producao`,
   e um **novo** `ASAAS_WEBHOOK_TOKEN`. Faça **Redeploy**.
3. No Asaas de produção, cadastre o webhook de novo (mesma URL, novo token,
   mesmos eventos).
4. Configure a **emissão automática de nota fiscal (NFS-e)** no painel do Asaas
   (dados da empresa e código de serviço do município).
5. Faça uma compra real de valor cheio com um cartão de vocês e estorne em
   seguida, para conferir o ciclo completo.

---

## 9. Pendências antes de abrir as vendas

- [ ] **Termos de uso e política de privacidade (LGPD)**, redigidos ou revisados
      por um advogado, com link no rodapé e no cadastro. Devem cobrir: dados
      coletados (incluindo desempenho e tempo de estudo), uso de IA para
      correção, 7 dias de arrependimento, acesso vitalício e janela de 12 meses.
- [ ] **Calibrar a correção por IA**: ~50 respostas reais corrigidas pelo
      professor comparadas com a IA (README, "Correção por IA").
- [ ] **Preço da renovação** (`PRECO_RENOVACAO_*`), se já for oferecer.
- [ ] Confirmar no Asaas as **bandeiras aceitas** (Elo, Hipercard) — a landing
      menciona "Elo, Visa, Mastercard e outras bandeiras".
- [ ] Conferir as **taxas** do parcelado e da antecipação no Asaas.

---

## 10. Depois do lançamento

- **Erros**: Vercel → projeto → **Logs** (filtre por "Error"). As falhas de IA,
  webhook e checkout ficam registradas lá com a mensagem.
- **Custo de IA**: tabela `uso_ia` no Supabase e o painel da Anthropic.
- **Backups**: no Supabase Pro, os backups diários ficam em **Database → Backups**.
- **Atualizações**: cada merge no `main` gera um deploy novo automaticamente. Se
  algo der errado, a Vercel permite voltar para o deploy anterior com um clique
  (**Deployments → Promote to Production**).
