// Modelos de e-mail do login (Supabase Auth) com a identidade OdontoLab.
//
// Gere os arquivos com `npm run emails` e cole cada um no painel do Supabase
// (Authentication → Emails → Templates). O passo a passo está em
// supabase/templates/README.md.
//
// Os modelos usam as variáveis do Supabase ({{ .SiteURL }}, {{ .TokenHash }},
// {{ .Data.* }}, …). E-mail não aceita CSS externo nem SVG no Gmail: tudo em
// tabelas com estilo inline e o símbolo em PNG servido pelo próprio site.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Cores da marca (docs/MARCA.md): Violeta, Lima, Tinta e Papel.
const COR = {
  violeta: "#5B3DF0",
  tinta: "#12121C",
  texto: "#3A3A48",
  suave: "#6B6B7B",
  fundo: "#F2F4F7",
  borda: "#E2E3EA",
  lima: "#C8F250",
};
const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

/** Link que passa pelo /auth/confirmar do site (funciona em qualquer aparelho). */
function linkConfirmacao(tipo, proximo) {
  return `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=${tipo}&next=${proximo}`;
}

// Volta para onde o aluno estava ao se cadastrar (ex.: /assinar). Contas sem
// esse dado vão para o painel.
const PROXIMO = "{{ if .Data.proximo }}{{ .Data.proximo }}{{ else }}/aluno{{ end }}";

const SAUDACAO = "{{ if .Data.primeiro_nome }}Olá, {{ .Data.primeiro_nome }}!{{ else }}Olá!{{ end }}";

function botao(texto, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr>
    <td bgcolor="${COR.violeta}" style="border-radius:999px;mso-padding-alt:14px 28px">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONTE};font-size:16px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:999px">${texto}</a>
    </td>
  </tr>
</table>`;
}

function linkReserva(href) {
  return `<p style="margin:20px 0 0;font-size:13px;line-height:20px;color:${COR.suave}">Se o botão não funcionar, copie e cole este endereço no navegador:<br>
<a href="${href}" style="color:${COR.violeta};word-break:break-all">${href}</a></p>`;
}

function codigo(valor) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
  <tr>
    <td bgcolor="${COR.lima}" style="border:2px solid ${COR.tinta};border-radius:12px;padding:16px 20px 16px 28px;font-family:${MONO};font-size:30px;font-weight:700;letter-spacing:8px;color:${COR.tinta}">${valor}</td>
  </tr>
</table>`;
}

function paragrafo(texto) {
  return `<p style="margin:0 0 14px;font-size:16px;line-height:26px;color:${COR.texto}">${texto}</p>`;
}

/** Layout comum: logo, cartão branco com borda Tinta e faixa da marca, rodapé. */
function layout({ assunto, preheader, titulo, corpo, aviso }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${assunto}</title>
</head>
<body style="margin:0;padding:0;background:${COR.fundo};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.fundo}" style="background:${COR.fundo}">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
        <tr>
          <td style="padding:0 4px 20px">
            <a href="{{ .SiteURL }}" target="_blank" style="text-decoration:none">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px"><img src="{{ .SiteURL }}/marca/odontolab-simbolo-512.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px"></td>
                  <td style="font-family:${FONTE};font-size:24px;font-weight:800;letter-spacing:-0.8px;color:${COR.tinta}">odonto</td>
                  <td style="padding-left:6px"><span style="display:inline-block;padding:3px 7px;border-radius:5px;background:${COR.violeta};font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:1.5px;color:#FFFFFF">LAB</span></td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
        <tr>
          <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:2px solid ${COR.tinta};border-radius:16px;overflow:hidden">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td height="6" bgcolor="${COR.violeta}" style="height:6px;line-height:6px;font-size:0;background:${COR.violeta}">&nbsp;</td>
                <td height="6" width="72" bgcolor="${COR.lima}" style="height:6px;width:72px;line-height:6px;font-size:0;background:${COR.lima}">&nbsp;</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:36px 36px 32px;font-family:${FONTE}">
                  <h1 style="margin:0 0 18px;font-family:${FONTE};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.5px;color:${COR.tinta}">${titulo}</h1>
${corpo}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:18px 36px;border-top:1px solid ${COR.borda};font-family:${FONTE};font-size:13px;line-height:20px;color:${COR.suave}">${aviso}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 12px 0;font-family:${FONTE};font-size:12px;line-height:18px;color:${COR.suave}">
            <strong style="color:${COR.tinta}">OdontoLab</strong> · o laboratório de estudos da graduação em Odontologia<br>
            <a href="{{ .SiteURL }}" style="color:${COR.violeta};text-decoration:none">odontolab.online</a> · Este é um e-mail automático, não precisa responder.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

const AVISO_PADRAO = "Por segurança, o link vale por 1 hora e só pode ser usado uma vez. Se você não pediu isso, pode ignorar este e-mail.";

/** Um item por modelo do painel do Supabase. */
export const modelos = [
  {
    arquivo: "confirmar-cadastro.html",
    painel: "Confirm signup",
    assunto: "Confirme seu e-mail na OdontoLab",
    variaveis: ["{{ .TokenHash }}", "type=email"],
    html: layout({
      assunto: "Confirme seu e-mail na OdontoLab",
      preheader: "Falta só um clique para ativar sua conta.",
      titulo: "Confirme seu e-mail",
      corpo: [
        paragrafo(SAUDACAO),
        paragrafo("Sua conta na OdontoLab foi criada. Confirme que este e-mail é seu para começar a estudar."),
        botao("Confirmar meu e-mail", linkConfirmacao("email", PROXIMO)),
        linkReserva(linkConfirmacao("email", PROXIMO)),
      ].join("\n"),
      aviso: "Por segurança, o link vale por 1 hora. Se você não criou uma conta na OdontoLab, ignore este e-mail.",
    }),
  },
  {
    arquivo: "redefinir-senha.html",
    painel: "Reset password",
    assunto: "Crie uma nova senha na OdontoLab",
    variaveis: ["{{ .TokenHash }}", "type=recovery"],
    html: layout({
      assunto: "Crie uma nova senha na OdontoLab",
      preheader: "Use o link para criar uma nova senha.",
      titulo: "Crie uma nova senha",
      corpo: [
        paragrafo(SAUDACAO),
        paragrafo("Recebemos um pedido para trocar a senha da sua conta. Clique no botão para escolher uma nova."),
        botao("Criar nova senha", linkConfirmacao("recovery", "/redefinir-senha")),
        linkReserva(linkConfirmacao("recovery", "/redefinir-senha")),
      ].join("\n"),
      aviso: "O link vale por 1 hora. Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.",
    }),
  },
  {
    arquivo: "convite.html",
    painel: "Invite user",
    assunto: "Você foi convidado para a OdontoLab",
    variaveis: ["{{ .TokenHash }}", "type=invite"],
    html: layout({
      assunto: "Você foi convidado para a OdontoLab",
      preheader: "Aceite o convite e crie sua senha.",
      titulo: "Você foi convidado para a OdontoLab",
      corpo: [
        paragrafo("Olá!"),
        paragrafo("Você recebeu um convite para acessar a OdontoLab. Aceite o convite e crie sua senha para entrar."),
        botao("Aceitar convite", linkConfirmacao("invite", "/redefinir-senha")),
        linkReserva(linkConfirmacao("invite", "/redefinir-senha")),
      ].join("\n"),
      aviso: "O convite vale por 1 hora. Se expirar, peça um novo a quem convidou você. Se não esperava este convite, ignore este e-mail.",
    }),
  },
  {
    arquivo: "alterar-email.html",
    painel: "Change email address",
    assunto: "Confirme seu novo e-mail na OdontoLab",
    variaveis: ["{{ .TokenHash }}", "type=email_change", "{{ .NewEmail }}"],
    html: layout({
      assunto: "Confirme seu novo e-mail na OdontoLab",
      preheader: "Confirme a troca do e-mail da sua conta.",
      titulo: "Confirme seu novo e-mail",
      corpo: [
        paragrafo(SAUDACAO),
        paragrafo(`Recebemos um pedido para trocar o e-mail da sua conta de <strong>{{ .Email }}</strong> para <strong>{{ .NewEmail }}</strong>.`),
        botao("Confirmar novo e-mail", linkConfirmacao("email_change", "/aluno")),
        linkReserva(linkConfirmacao("email_change", "/aluno")),
      ].join("\n"),
      aviso: AVISO_PADRAO,
    }),
  },
  {
    arquivo: "link-magico.html",
    painel: "Magic link",
    assunto: "Seu link de acesso à OdontoLab",
    variaveis: ["{{ .TokenHash }}", "type=email"],
    html: layout({
      assunto: "Seu link de acesso à OdontoLab",
      preheader: "Entre na sua conta com um clique.",
      titulo: "Seu link de acesso",
      corpo: [
        paragrafo(SAUDACAO),
        paragrafo("Use o botão abaixo para entrar na sua conta, sem precisar da senha."),
        botao("Entrar na OdontoLab", linkConfirmacao("email", "/aluno")),
        linkReserva(linkConfirmacao("email", "/aluno")),
      ].join("\n"),
      aviso: AVISO_PADRAO,
    }),
  },
  {
    arquivo: "reautenticacao.html",
    painel: "Reauthentication",
    assunto: "Seu código de confirmação da OdontoLab",
    variaveis: ["{{ .Token }}"],
    html: layout({
      assunto: "Seu código de confirmação da OdontoLab",
      preheader: "Use este código para confirmar a ação.",
      titulo: "Seu código de confirmação",
      corpo: [
        paragrafo(SAUDACAO),
        paragrafo("Digite este código na OdontoLab para confirmar que é você:"),
        codigo("{{ .Token }}"),
      ].join("\n"),
      aviso: "O código vale por pouco tempo e só pode ser usado uma vez. Nunca passe este código para ninguém: a equipe da OdontoLab não pede códigos.",
    }),
  },
];

// Valores de exemplo para as prévias (npm run emails -- --previa PASTA).
const EXEMPLO = {
  "{{ .SiteURL }}": "https://odontolab.online",
  "{{ .TokenHash }}": "pkce_exemplo123",
  "{{ .Token }}": "482913",
  "{{ .Email }}": "ana@exemplo.com",
  "{{ .NewEmail }}": "ana.souza@exemplo.com",
  [PROXIMO]: "/assinar",
  [SAUDACAO]: "Olá, Ana!",
};

function comExemplo(html) {
  return Object.entries(EXEMPLO).reduce((texto, [chave, valor]) => texto.replaceAll(chave, valor), html);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
  const destino = join(raiz, "supabase", "templates");
  mkdirSync(destino, { recursive: true });
  for (const m of modelos) writeFileSync(join(destino, m.arquivo), m.html);
  console.log(`${modelos.length} modelos gerados em supabase/templates/`);

  const i = process.argv.indexOf("--previa");
  if (i > -1 && process.argv[i + 1]) {
    const pasta = process.argv[i + 1];
    mkdirSync(pasta, { recursive: true });
    for (const m of modelos) writeFileSync(join(pasta, m.arquivo), comExemplo(m.html));
    console.log(`Prévias com dados de exemplo em ${pasta}`);
  }
}
