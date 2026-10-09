// Formulário de mapeamento ("Personalize sua OdontoLab") e perfis de cliente.
// Puro e testável: usado na tela do aluno (cliente), na Server Action e no backoffice.
//
// Respondido depois da compra, em duas etapas: a 1 no primeiro acesso (até 7
// perguntas de toque) e a 2 a partir do 3º dia, com 50 flashcards de prêmio.
// A pergunta 1 separa o caminho de estudante do de formado. Sem mentoria por
// enquanto: as perguntas 16 e 24 do documento original ficaram de fora.

import { MODULOS, PRECO_MENSAL, type Ciclo, type Modulo, type Plano } from "@/lib/planos";

export const NOME_DO_PROFESSOR = "Dr. Vinicius Vilela";
export const CARDS_NA_AMOSTRA = 50;
/** A etapa 2 aparece no painel a partir deste dia depois da etapa 1. */
export const DIAS_ATE_ETAPA_2 = 3;

export type Opcao = readonly [valor: string, rotulo: string];
export type Caminho = "todos" | "estudante" | "formado";

export type Pergunta = {
  id: string;
  numero: number;
  texto: string;
  etapa: 1 | 2;
  para: Caminho;
  /** unica: um toque. multipla: até `max`. local: estado + cidade. disciplinas: lista do banco. */
  tipo: "unica" | "multipla" | "texto" | "local" | "disciplinas";
  opcoes?: readonly Opcao[];
  max?: number;
  opcional?: boolean;
  /** Campo de texto extra (opcional) quando a resposta é uma destas. */
  complemento?: { quando: readonly string[]; rotulo: string };
};

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export const PERGUNTAS: readonly Pergunta[] = [
  // Bloco A: quem é você
  {
    id: "p1", numero: 1, etapa: 1, para: "todos", tipo: "unica",
    texto: "Em que momento da Odontologia você está?",
    opcoes: [
      ["estudante", "Estudante de graduação"],
      ["formado_ate2", "Formado há até 2 anos"],
      ["formado_mais2", "Formado há mais de 2 anos"],
      ["outro", "Outro (ASB, TSB, professor)"],
    ],
  },
  {
    id: "p2", numero: 2, etapa: 2, para: "todos", tipo: "unica", opcional: true,
    texto: "Qual a sua faixa de idade?",
    opcoes: [["ate20", "Até 20"], ["21a24", "21 a 24"], ["25a30", "25 a 30"], ["31a40", "31 a 40"], ["41mais", "41 ou mais"]],
  },
  { id: "p3", numero: 3, etapa: 2, para: "todos", tipo: "local", opcional: true, texto: "Em que estado e cidade você mora?" },
  {
    id: "p4", numero: 4, etapa: 2, para: "todos", tipo: "unica",
    texto: "Como você conheceu a OdontoLab?",
    opcoes: [
      ["anuncio", `Anúncio no Instagram com ${NOME_DO_PROFESSOR}`],
      ["perfil", "Perfil da OdontoLab"],
      ["telegram", "Grupo do Telegram"],
      ["indicacao", "Indicação de colega"],
      ["faculdade", "Professor ou faculdade"],
      ["google", "Busca no Google"],
      ["outro", "Outro"],
    ],
  },
  // Bloco B: só para estudantes
  {
    id: "p5", numero: 5, etapa: 1, para: "estudante", tipo: "unica",
    texto: "Em qual período você está?",
    opcoes: [["1-2", "1º ou 2º"], ["3-4", "3º ou 4º"], ["5-6", "5º ou 6º"], ["7-8", "7º ou 8º"], ["9-10", "9º ou 10º"]],
  },
  {
    id: "p6", numero: 6, etapa: 2, para: "estudante", tipo: "unica",
    texto: "Sua faculdade é pública ou particular?",
    opcoes: [["publica", "Pública"], ["particular", "Particular"]],
    complemento: { quando: ["publica", "particular"], rotulo: "Nome da faculdade (opcional)" },
  },
  {
    id: "p7", numero: 7, etapa: 2, para: "estudante", tipo: "unica",
    texto: "Você já atende pacientes na clínica da faculdade?",
    opcoes: [["nao", "Ainda não"], ["comecei", "Comecei este semestre"], ["sim", "Sim, há mais de um semestre"]],
  },
  {
    id: "p8", numero: 8, etapa: 1, para: "estudante", tipo: "disciplinas", max: 2,
    texto: "Qual disciplina mais te preocupa agora? (até 2)",
  },
  {
    id: "p9", numero: 9, etapa: 2, para: "estudante", tipo: "multipla", max: 8,
    texto: "Como você estuda hoje? (pode marcar várias)",
    opcoes: [
      ["slides", "Slides do professor"],
      ["resumos_proprios", "Resumos próprios"],
      ["resumos_colegas", "Resumos de colegas ou comprados"],
      ["youtube", "Videoaulas no YouTube"],
      ["livros", "Livros"],
      ["flashcards", "Flashcards"],
      ["provas", "Provas antigas e questões"],
      ["ia", "Inteligência artificial"],
    ],
  },
  {
    id: "p10", numero: 10, etapa: 2, para: "estudante", tipo: "unica",
    texto: "Quantas horas por semana você estuda fora da aula?",
    opcoes: [["menos2", "Menos de 2"], ["2a5", "2 a 5"], ["5a10", "5 a 10"], ["mais10", "Mais de 10"]],
  },
  // Bloco C: só para formados
  {
    id: "p11", numero: 11, etapa: 1, para: "formado", tipo: "unica",
    texto: "Onde você trabalha hoje?",
    opcoes: [
      ["consultorio_proprio", "Consultório próprio"],
      ["clinica_terceiros", "Clínica de terceiros"],
      ["rede_publica", "Rede pública"],
      ["sem_atender", "Ainda não estou atendendo"],
      ["nao_clinica", "Não atuo na clínica (docência, pesquisa)"],
    ],
  },
  {
    id: "p12", numero: 12, etapa: 2, para: "formado", tipo: "unica",
    texto: "Quantos pacientes você atende por semana?",
    opcoes: [["ate10", "Até 10"], ["11a25", "11 a 25"], ["26a50", "26 a 50"], ["mais50", "Mais de 50"]],
  },
  {
    id: "p13", numero: 13, etapa: 1, para: "formado", tipo: "unica",
    texto: "Como você organiza agenda, pacientes e caixa?",
    opcoes: [
      ["papel", "Papel ou caderno"],
      ["planilha", "Planilha"],
      ["whatsapp", "WhatsApp e memória"],
      ["software", "Software de gestão"],
      ["nao_organizo", "Não organizo"],
    ],
  },
  {
    id: "p14", numero: 14, etapa: 2, para: "formado", tipo: "unica",
    texto: "Você tem ou está cursando especialização?",
    opcoes: [["nao", "Não"], ["cursando", "Cursando"], ["concluida", "Concluída"]],
    complemento: { quando: ["cursando", "concluida"], rotulo: "Em qual área? (opcional)" },
  },
  {
    id: "p15", numero: 15, etapa: 2, para: "formado", tipo: "multipla", max: 2,
    texto: "Qual procedimento você quer dominar nos próximos 12 meses? (até 2)",
    opcoes: [
      ["facetas", "Facetas e lentes de contato"],
      ["clareamento", "Clareamento"],
      ["implantes", "Implantes"],
      ["endodontia", "Endodontia"],
      ["ortodontia", "Ortodontia e alinhadores"],
      ["harmonizacao", "Harmonização orofacial"],
      ["cirurgia", "Cirurgia"],
      ["protese", "Prótese"],
      ["outro", "Outro"],
    ],
  },
  // Bloco D: interesse e objetivo
  {
    id: "p17", numero: 17, etapa: 1, para: "todos", tipo: "multipla", max: 2,
    texto: "Qual área da Odontologia mais te interessa? (até 2)",
    opcoes: [
      ["dentistica", "Dentística e estética"],
      ["endodontia", "Endodontia"],
      ["periodontia", "Periodontia"],
      ["implantodontia", "Implantodontia"],
      ["ortodontia", "Ortodontia"],
      ["cirurgia", "Cirurgia bucomaxilofacial"],
      ["protese", "Prótese"],
      ["odontopediatria", "Odontopediatria"],
      ["harmonizacao", "Harmonização orofacial"],
      ["saude_coletiva", "Saúde coletiva"],
      ["radiologia", "Radiologia"],
      ["estomatologia", "Estomatologia e patologia"],
      ["nao_sei", "Ainda não sei"],
    ],
  },
  {
    id: "p18", numero: 18, etapa: 1, para: "todos", tipo: "unica",
    texto: "Qual seu principal objetivo nos próximos 6 meses?",
    opcoes: [
      ["provas", "Passar nas provas da faculdade"],
      ["clinica", "Atender com segurança na clínica"],
      ["concurso", "Passar em concurso, residência ou especialização"],
      ["atualizar", "Revisar e me atualizar"],
      ["consultorio", "Organizar e fazer crescer meu consultório"],
      ["procedimento", "Aprender um procedimento específico"],
    ],
  },
  {
    id: "p19", numero: 19, etapa: 1, para: "todos", tipo: "unica",
    texto: "O que mais te trava hoje?",
    opcoes: [
      ["tempo", "Falta de tempo"],
      ["volume", "Conteúdo demais, não sei por onde começar"],
      ["memoria", "Esqueço o que estudei"],
      ["prova", "Não sei se estou pronto para a prova"],
      ["clinica", "Insegurança na prática clínica"],
      ["dinheiro", "Dinheiro para investir em cursos"],
      ["pacientes", "Captar e manter pacientes"],
    ],
  },
  {
    id: "p20", numero: 20, etapa: 1, para: "todos", tipo: "unica",
    texto: "Tem prova ou data importante chegando?",
    opcoes: [["2semanas", "Em até 2 semanas"], ["1mes", "Em 1 mês"], ["2a3meses", "Em 2 a 3 meses"], ["sem_data", "Sem data marcada"]],
  },
  // Bloco E: compra e relacionamento
  {
    id: "p21", numero: 21, etapa: 2, para: "todos", tipo: "unica",
    texto: "O que te fez assinar hoje?",
    opcoes: [
      ["preco", "O preço"],
      ["disciplina", "Uma disciplina específica"],
      ["prova", "Prova chegando"],
      ["indicacao", "Indicação"],
      ["anuncio", `Vi o ${NOME_DO_PROFESSOR} nos anúncios`],
      ["testar", "Quis testar"],
    ],
  },
  {
    id: "p22", numero: 22, etapa: 2, para: "todos", tipo: "unica",
    texto: "Você estuda sozinho ou com alguém?",
    opcoes: [["sozinho", "Sozinho"], ["colega", "Com um colega fixo"], ["grupo", "Em grupo"]],
  },
  {
    id: "p23", numero: 23, etapa: 2, para: "todos", tipo: "unica",
    texto: "Como você prefere pagar?",
    opcoes: [["pix", "Pix"], ["cartao_mensal", "Cartão, todo mês"], ["parcelado", "Cartão parcelado"]],
  },
  {
    id: "p25", numero: 25, etapa: 2, para: "todos", tipo: "unica",
    texto: "Por onde prefere receber novidades?",
    opcoes: [["whatsapp", "WhatsApp"], ["email", "E-mail"], ["telegram", "Telegram"], ["instagram", "Instagram"]],
  },
  {
    id: "p26", numero: 26, etapa: 2, para: "todos", tipo: "texto", opcional: true,
    texto: "Se a OdontoLab resolvesse uma coisa para você neste semestre, qual seria?",
  },
];

const POR_ID = new Map(PERGUNTAS.map((p) => [p.id, p]));
export const pergunta = (id: string) => POR_ID.get(id);

/** Valor de cada resposta: texto (única, texto) ou lista (múltipla, disciplinas). */
export type Respostas = Record<string, string | string[] | boolean>;

export function caminhoDe(respostas: Respostas): Caminho {
  const p1 = respostas.p1;
  if (p1 === "estudante") return "estudante";
  if (p1 === "formado_ate2" || p1 === "formado_mais2") return "formado";
  return "todos";
}

/** Perguntas de uma etapa no caminho da pessoa (a pergunta 1 decide o caminho). */
export function perguntasDa(etapa: 1 | 2, respostas: Respostas): Pergunta[] {
  const caminho = caminhoDe(respostas);
  return PERGUNTAS.filter((p) => p.etapa === etapa && (p.para === "todos" || p.para === caminho));
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Confere e limpa as respostas de uma etapa. Devolve só o que pertence à etapa
 * (no caminho da pessoa) ou o erro da primeira pergunta obrigatória sem resposta.
 */
export function validarEtapa(
  etapa: 1 | 2,
  entrada: Record<string, unknown>,
  anteriores: Respostas,
  disciplinasValidas: readonly string[],
): { respostas: Respostas } | { erro: string } {
  // Na etapa 1, o caminho vem da própria pergunta 1; na 2, do que já foi salvo.
  const caminho: Respostas = etapa === 1 ? { p1: typeof entrada.p1 === "string" ? entrada.p1 : "" } : anteriores;
  const limpas: Respostas = {};
  for (const p of perguntasDa(etapa, caminho)) {
    const bruto = entrada[p.id];
    let valor: string | string[] | undefined;
    if (p.tipo === "unica") {
      valor = p.opcoes!.some(([v]) => v === bruto) ? (bruto as string) : undefined;
    } else if (p.tipo === "multipla" || p.tipo === "disciplinas") {
      const validos = p.tipo === "disciplinas" ? disciplinasValidas : p.opcoes!.map(([v]) => v);
      const lista = Array.isArray(bruto) ? [...new Set(bruto.filter((v): v is string => validos.includes(v as string)))] : [];
      valor = lista.length ? lista.slice(0, p.max ?? lista.length) : undefined;
    } else if (p.tipo === "texto") {
      valor = texto(bruto, 1000) || undefined;
    } else if (p.tipo === "local") {
      const uf = UFS.find((u) => u === entrada.p3);
      if (uf) {
        limpas.p3 = uf;
        const cidade = texto(entrada.p3_cidade, 80);
        if (cidade) limpas.p3_cidade = cidade;
      }
      continue;
    }
    if (valor === undefined) {
      if (!p.opcional) return { erro: `Responda a pergunta ${p.numero}: ${p.texto}` };
      continue;
    }
    limpas[p.id] = valor;
    if (p.complemento && typeof valor === "string" && p.complemento.quando.includes(valor)) {
      const extra = texto(entrada[`${p.id}_extra`], 120);
      if (extra) limpas[`${p.id}_extra`] = extra;
    }
  }
  if (etapa === 2) limpas.contato = entrada.contato === true;
  return { respostas: limpas };
}

// -----------------------------------------------------------------------------
// Perfis, etiquetas e nota
// -----------------------------------------------------------------------------

export const PERFIS = {
  calouro: "Calouro do básico",
  clinica: "Estudante na clínica",
  formando: "Formando",
  recem_formado: "Recém-formado",
  consultorio: "Dono de consultório",
  concurseiro: "Concurseiro",
  formado: "Formado (sem consultório próprio)",
  outro: "Outro (ASB, TSB, professor)",
} as const;
export type PerfilCliente = keyof typeof PERFIS;

export function perfilDe(r: Respostas): PerfilCliente | null {
  if (!r.p1) return null;
  if (r.p18 === "concurso") return "concurseiro";
  if (r.p1 === "estudante") {
    if (r.p5 === "1-2" || r.p5 === "3-4") return "calouro";
    if (r.p5 === "5-6" || r.p5 === "7-8") return "clinica";
    if (r.p5 === "9-10") return "formando";
    return null;
  }
  if (r.p11 === "consultorio_proprio") return "consultorio";
  if (r.p1 === "formado_ate2") return "recem_formado";
  if (r.p1 === "formado_mais2") return "formado";
  return "outro";
}

const lista = (v: Respostas[string]) => (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []);

/** Etiquetas "grupo:valor" para filtrar no backoffice e exportar. */
export function etiquetasDe(r: Respostas): string[] {
  const perfil = perfilDe(r);
  const areas = [...new Set([...lista(r.p17).filter((a) => a !== "nao_sei"), ...lista(r.p15).filter((a) => a !== "outro")])];
  return [
    ...(perfil ? [`perfil:${perfil}`] : []),
    ...areas.map((a) => `area:${a}`),
    ...lista(r.p19).map((v) => `dor:${v}`),
    ...lista(r.p20).map((v) => `urgencia:${v}`),
    ...lista(r.p4).map((v) => `origem:${v}`),
    ...lista(r.p23).map((v) => `pagamento:${v}`),
    ...lista(r.p22).map((v) => `companhia:${v}`),
  ];
}

/**
 * Nota para o Completo anual (0 a 10). 6 ou mais: oferecer o anual na
 * primeira semana; abaixo de 6: primeiro o adicional ligado à dor.
 */
export function notaAnual(r: Respostas): number {
  let nota = 0;
  const avancado = r.p1 === "formado_ate2" || r.p1 === "formado_mais2" || ["5-6", "7-8", "9-10"].includes(r.p5 as string);
  if (avancado) nota += 3;
  if (r.p20 === "2a3meses" || r.p20 === "sem_data" || r.p18 === "concurso") nota += 2;
  if (["5a10", "mais10"].includes(r.p10 as string) || ["11a25", "26a50", "mais50"].includes(r.p12 as string)) nota += 2;
  if (r.p23 === "parcelado") nota += 2;
  if (typeof r.p21 === "string" && r.p21 !== "testar") nota += 1;
  return nota;
}

/** Módulos ligados à dor (P19) e à organização do consultório (P13). */
export function modulosDeInteresse(r: Respostas): Modulo[] {
  const modulos: Modulo[] = [];
  if (r.p19 === "memoria") modulos.push("flashcards");
  if (r.p19 === "prova") modulos.push("simulados");
  if (r.p19 === "clinica") modulos.push("chat");
  if (["papel", "planilha", "whatsapp", "nao_organizo"].includes(r.p13 as string)) modulos.push("consultorio");
  return modulos;
}

// -----------------------------------------------------------------------------
// Oferta do painel
// -----------------------------------------------------------------------------

export type Oferta = { chave: string; titulo: string; texto: string; botao: string; href: string };

type AcessoOferta = { plano: Plano; ciclo: Ciclo; modulos: readonly string[]; titular: boolean; origem: "asaas" | "manual" };

const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * A oferta que o painel mostra a partir das respostas. Só para quem paga o
 * mensal (é o único que troca de plano pela própria área); para o anual e
 * cortesias, a oferta sai pelo contato, com a nota e as etiquetas do backoffice.
 */
export function ofertaPara(r: Respostas, acesso: AcessoOferta | null): Oferta | null {
  if (!acesso || !acesso.titular || acesso.origem !== "asaas" || acesso.ciclo !== "mensal") return null;
  const href = "/aluno/assinatura";
  const faltam = (Object.keys(MODULOS) as Modulo[]).filter((m) => !acesso.modulos.includes(m));

  if (!faltam.length) {
    if ((r.p22 === "colega" || r.p22 === "grupo") && acesso.plano !== "duplo") {
      return {
        chave: "duplo",
        titulo: "Estuda com alguém? Vá de Duplo",
        texto: `Tudo da plataforma para você e um colega por ${reais(PRECO_MENSAL.duplo)}/mês: ${reais(PRECO_MENSAL.duplo / 2)} para cada, cada um com sua conta.`,
        botao: "Ver o Duplo",
        href,
      };
    }
    return null;
  }

  const interesse = modulosDeInteresse(r).filter((m) => faltam.includes(m));
  const completo = { chave: "completo", botao: "Quero o Completo", href };
  if (r.p20 === "2semanas") {
    return {
      ...completo,
      titulo: "Prova em até 2 semanas? Libere tudo agora",
      texto: `No Completo você ganha ${faltam.map((m) => MODULOS[m].nome).join(", ")} na hora, por ${reais(PRECO_MENSAL.completo)}/mês.`,
    };
  }
  if (interesse.length >= 2 || (interesse.length && notaAnual(r) >= 6)) {
    return {
      ...completo,
      titulo: "Leve tudo no Completo",
      texto: `${interesse.map((m) => MODULOS[m].nome).join(" e ")} e o resto da plataforma por ${reais(PRECO_MENSAL.completo)}/mês.`,
    };
  }
  const [modulo] = interesse;
  if (!modulo) return null;
  const MENSAGENS: Record<Modulo, string> = {
    flashcards: "Revisão com repetição espaçada para não esquecer o que estudou.",
    simulados: "Simulados com correção das discursivas por IA antes da prova.",
    chat: "Tire dúvidas de Odontologia na hora, antes do atendimento.",
    consultorio: "Agenda, pacientes e caixa em um lugar só.",
    disciplinas: "",
  };
  return {
    chave: modulo,
    titulo: `Some ${MODULOS[modulo].nome} ao seu plano`,
    texto: `${MENSAGENS[modulo]} Por ${reais(MODULOS[modulo].precoCentavos)}/mês.`,
    botao: `Adicionar ${MODULOS[modulo].nome}`,
    href,
  };
}

/** Rótulo legível de uma resposta (para o backoffice e o CSV). */
export function rotuloDaResposta(id: string, valor: Respostas[string], nomesDisciplinas: Record<string, string> = {}): string {
  const p = pergunta(id);
  const valores = lista(valor as string | string[]);
  if (!p) return valores.join(", ");
  if (p.tipo === "disciplinas") return valores.map((v) => nomesDisciplinas[v] ?? v).join(", ");
  if (!p.opcoes) return valores.join(", ");
  return valores.map((v) => p.opcoes!.find(([o]) => o === v)?.[1] ?? v).join(", ");
}
