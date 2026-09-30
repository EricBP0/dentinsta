# Modelos de e-mail (Supabase Auth)

E-mails de cadastro, senha e convite com a identidade OdontoLab. Os arquivos
`.html` desta pasta são **gerados** por `scripts/emails.mjs`. Para mudar texto
ou visual, edite o script e rode:

```bash
npm run emails
```

Para ver as prévias com dados de exemplo no navegador:

```bash
npm run emails -- --previa /tmp/previa-emails
```

## Como aplicar no Supabase

No painel do projeto: **Authentication → Emails → Templates**. Para cada linha
da tabela, abra o modelo, troque o **Subject** e cole o conteúdo do arquivo no
campo **Message body** (aba *Source*). Depois clique em **Save**.

| Modelo no painel | Subject | Arquivo |
|---|---|---|
| Confirm signup | `Confirme seu e-mail na OdontoLab` | `confirmar-cadastro.html` |
| Reset password | `Crie uma nova senha na OdontoLab` | `redefinir-senha.html` |
| Invite user | `Você foi convidado para a OdontoLab` | `convite.html` |
| Change email address | `Confirme seu novo e-mail na OdontoLab` | `alterar-email.html` |
| Magic link | `Seu link de acesso à OdontoLab` | `link-magico.html` |
| Reauthentication | `Seu código de confirmação da OdontoLab` | `reautenticacao.html` |

Os dois primeiros são os que o site usa hoje. **Invite user** serve para
convidar o professor: em **Authentication → Users → Invite user**, ele recebe o
convite, cria a senha e entra (depois promova a conta a `professor`). Os outros
ficam prontos para quando forem usados.

## O que os modelos esperam

- **Site URL** (Authentication → URL Configuration) = `https://odontolab.online`.
  Os links e o símbolo do topo usam `{{ .SiteURL }}`; o símbolo é o arquivo
  `public/marca/odontolab-simbolo-512.png` servido pelo site.
- Os links vão para `/auth/confirmar?token_hash=…&type=…&next=…`, que confirma e
  leva o aluno ao lugar certo. Funciona mesmo se ele abrir o e-mail no celular
  depois de se cadastrar no computador.
- No cadastro, o site guarda `primeiro_nome` (para a saudação) e `proximo`
  (para voltar ao checkout depois de confirmar) nos dados do usuário. Contas
  sem esses dados recebem "Olá!" e vão para o painel.
- O texto diz que o link vale por **1 hora**, o padrão do Supabase (*Email OTP
  expiration* = 3600 s em Authentication → Providers → Email). Se mudar esse
  prazo, ajuste o texto no script.

## Testar

Depois de salvar, crie uma conta com um e-mail seu em `/entrar` e peça
"esqueci minha senha". Confira os dois e-mails no Gmail (celular e computador)
e se os botões levam para o lugar certo.
