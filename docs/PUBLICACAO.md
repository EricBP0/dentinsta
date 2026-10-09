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
| **GitHub** | Código (repositório `dentinsta`; o nome do repositório não precisa mudar) | Gratuito |
| **Vercel** | Hospedar o site | **Pro obrigatório**: o plano gratuito (Hobby) é só para uso pessoal e **proíbe uso comercial**, e a plataforma cobra dos alunos |
| **Supabase** | Banco de dados, login e arquivos | Comece no gratuito para testar. Para lançar, **Pro**: o gratuito pode pausar o projeto por inatividade e não tem backup diário |
| **Resend** (ou outro SMTP) | E-mails de confirmação de cadastro e de senha | Plano gratuito atende o começo |
| **Asaas** | Pagamentos (Pix, cartão, parcelado) e nota fiscal | Sem mensalidade; taxa por transação |
| **Anthropic** | IA (correção de discursivas e geração de questões e flashcards) | Pré-pago por uso |
| **Domínio** | `odontolab.online`, comprado na **Hostinger**. O DNS é configurado lá (seção 4.1) | Anual |

### O código

O `main` é o branch padrão e a Vercel publica ele como produção. Antes de
publicar, faça o merge do pull request do branch `claude/nifty-euler-ywoua0`
no `main` (enquanto isso, o `main` só tem o planejamento).

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
   - **Site URL**: `https://odontolab.online` (enquanto o domínio não estiver ativo, use o
     endereço `https://....vercel.app` que a Vercel gerar no passo 4).
   - **Redirect URLs**: adicione `https://odontolab.online/auth/confirmar` (e o
     equivalente no endereço `.vercel.app`).
5. **Authentication → Emails → SMTP Settings**: configure o SMTP próprio
   (passo 2). **Sem isso o cadastro não funciona em produção**: o e-mail padrão
   do Supabase envia só 2 mensagens por hora e só para membros da equipe.
6. **Authentication → Emails → Templates**: cole os modelos com a marca
   OdontoLab que estão em `supabase/templates/` (assunto e arquivo de cada um
   no [README da pasta](../supabase/templates/README.md)). Além do visual, eles
   fazem o link funcionar mesmo se o aluno abrir o e-mail no celular depois de
   se cadastrar no computador, e levam de volta ao checkout depois da
   confirmação.

   Se não trocar, os modelos padrão (em inglês) também funcionam, mas o link
   precisa ser aberto no mesmo navegador em que o aluno se cadastrou.

---

## 2. E-mail (Resend)

1. Crie a conta em [resend.com](https://resend.com) e adicione o seu domínio.
2. Cadastre na Hostinger os registros DNS que o Resend mostrar (veja a seção
   4.1, "Registros do Resend"). Espere o domínio ficar **verificado**.
3. Gere uma chave de API (SMTP) e preencha no Supabase (passo 1.5):
   - Host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a chave.
   - Remetente: por exemplo `nao-responda@odontolab.online`, nome `OdontoLab`.

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
   | `NEXT_PUBLIC_SITE_URL` | `https://odontolab.online` (ou o `.vercel.app` até o domínio estar ativo) |
   | `CERTIFICADO_RESPONSAVEL` | Nome de quem assina (ex.: `Dr. Fulano de Tal`) |
   | `CERTIFICADO_RESPONSAVEL_CARGO` | Ex.: `CRO-SP 12345 · Coordenador pedagógico` |

   Opcionais: `IA_MODELO`, `IA_EFFORT`, `IA_COTA_MENSAL`, `IA_MODELO_GERACAO`,
   `IA_EFFORT_GERACAO`, `CERTIFICADO_PLATAFORMA`.

3. Clique em **Deploy**. As funções rodam na região de São Paulo (`gru1`),
   definida no `vercel.json`.
4. **Domínio**: **Settings → Domains** → adicione `odontolab.online`
   e também `www.odontolab.online`. Deixe `odontolab.online` (sem www) como
   principal e o `www` redirecionando para ele: é o endereço usado nos
   e-mails, no checkout e no QR do certificado. Depois crie na Hostinger os
   registros que a Vercel indicar (seção 4.1).
5. Quando o domínio estiver ativo, confira se `NEXT_PUBLIC_SITE_URL` e a **Site
   URL** do Supabase usam o domínio final e faça **Redeploy**. Variáveis que
   começam com `NEXT_PUBLIC_` só mudam depois de um novo deploy.

6. **Analytics**: na aba **Analytics** do projeto, clique em **Enable**. O
   componente já está no código (`<Analytics />` em `src/app/layout.tsx`); as
   visitas aparecem depois do próximo deploy. Não usa cookies, então não
   precisa de banner de consentimento.
7. **Speed Insights**: na aba **Speed Insights**, clique em **Enable**. Mede a
   velocidade real das páginas nos aparelhos dos alunos (`<SpeedInsights />`
   também está no `layout.tsx`).

### 4.1 DNS na Hostinger

O domínio fica registrado na Hostinger; só os registros de DNS apontam para a
Vercel (site) e para o Resend (e-mail). **Não troque os nameservers**: manter o
DNS na Hostinger é o mais simples e não mexe em outros serviços que você
tenha lá (como um e-mail da Hostinger).

No **hPanel**: **Domínios → seu domínio → DNS / Nameservers → Gerenciar
registros DNS**. No campo **Nome**, a Hostinger usa `@` para o domínio raiz e
só o prefixo para subdomínios (`www`, e não `www.odontolab.online`).

**1. Apague os registros que apontam para a Hostinger.** Um domínio novo vem
com um registro `A` em `@` (página de "domínio estacionado") e um `CNAME` em
`www`. Se ficarem, conflitam com os da Vercel. Apague só esses dois: não apague
`MX`, `TXT` ou `CAA` que já existam.

**2. Registros da Vercel (site).** Use exatamente os valores que a Vercel
mostrar em **Settings → Domains**. Normalmente são:

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| `A` | `@` | o IP que a Vercel mostrar (hoje costuma ser `76.76.21.21`) | 3600 |
| `CNAME` | `www` | o endereço que a Vercel mostrar (ex.: `cname.vercel-dns.com`) | 3600 |

Se a Vercel pedir um registro `TXT` com nome `_vercel` para confirmar a posse
do domínio, crie também.

**3. Registros do Resend (e-mail).** Em **Resend → Domains → seu domínio**,
copie cada registro para a Hostinger. Eles ficam em subdomínios próprios
(`send`, `resend._domainkey`), então **não atrapalham um e-mail da Hostinger**
que use o domínio raiz. São parecidos com:

| Tipo | Nome | Valor |
|---|---|---|
| `MX` | `send` | `feedback-smtp….amazonses.com` (prioridade 10) |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` |
| `TXT` | `resend._domainkey` | a chave DKIM longa que o Resend mostrar |
| `TXT` | `_dmarc` | `v=DMARC1; p=none;` (recomendado; crie só se ainda não existir) |

Cuidado ao colar o nome: se o Resend mostrar `send.odontolab.online`, na
Hostinger escreva só `send`, senão o registro vira
`send.odontolab.online.odontolab.online`.

**4. Espere e confira.** Costuma propagar em minutos, mas pode levar até 24h.
A Vercel mostra **Valid Configuration** e emite o certificado HTTPS sozinha; o
Resend mostra **Verified**. Se o certificado não sair, veja se há registros
`CAA` na Hostinger: eles precisam permitir `letsencrypt.org` (ou apague os
`CAA`).

Depois disso, siga o passo 5 da seção 4 (atualizar `NEXT_PUBLIC_SITE_URL` e a
Site URL do Supabase e fazer Redeploy).

---

## 5. Asaas (pagamentos) — primeiro no sandbox

1. Crie a conta de testes em [sandbox.asaas.com](https://sandbox.asaas.com) e
   gere a chave de API (**Integrações → Chaves de API**). Coloque em
   `ASAAS_API_KEY` na Vercel, com `ASAAS_AMBIENTE=sandbox`.
2. **Integrações → Webhooks → Adicionar**:
   - URL: `https://odontolab.online/api/asaas/webhook`
   - Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - Tipo de envio: sequencial
   - Eventos: `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`,
     `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`,
     `PAYMENT_CHARGEBACK_REQUESTED`, `SUBSCRIPTION_DELETED`,
     `SUBSCRIPTION_INACTIVATED`
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
- [ ] **Assinatura no sandbox**: assine o mensal com cartão de teste, confira a
  segunda cobrança (adiante a data no painel do sandbox), troque de plano e cancele.
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
