import {
  ArrowRight,
  Brain,
  CalendarDays,
  ChartColumn,
  Check,
  FileText,
  GraduationCap,
  Layers,
  MessageCircle,
  Network,
  PenLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { CabecalhoLanding } from "@/components/landing/cabecalho-landing";
import { PreviaProduto } from "@/components/landing/previa-produto";
import { Movimento, Surgir, SurgirItem, SurgirLista } from "@/components/movimento";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarReais, PRECO, totalParcelado } from "@/lib/preco";

const RECURSOS = [
  {
    icone: Sparkles,
    titulo: "Simulados com correção por IA",
    texto: "Questões objetivas e discursivas no estilo das provas da faculdade. A IA corrige as discursivas critério por critério e mostra o que faltou.",
    destaque: true,
  },
  {
    icone: Layers,
    titulo: "Flashcards inteligentes",
    texto: "Repetição espaçada: cada card volta no dia certo para você não esquecer.",
  },
  { icone: Video, titulo: "Videoaulas", texto: "Aulas objetivas, gravadas por um cirurgião-dentista." },
  { icone: FileText, titulo: "Resumos de bolso", texto: "O essencial de cada tema, com figuras e pontos-chave, para revisar em minutos." },
  { icone: Network, titulo: "Mapas mentais", texto: "A matéria inteira em uma imagem, para fixar as conexões." },
  {
    icone: GraduationCap,
    titulo: "Certificados",
    texto: "Conclua os itens obrigatórios de cada disciplina e receba seu certificado.",
    largo: true,
  },
];

const NOVIDADES = [
  {
    icone: MessageCircle,
    selo: "Novo · IA",
    titulo: "Chat de dúvidas com IA",
    texto: "Travou numa matéria? Pergunte qualquer coisa de Odontologia e receba uma explicação didática na hora, como se fosse o professor.",
    itens: [
      "Qualquer dúvida de Odontologia, do básico à clínica",
      "Explicação passo a passo, com os termos da prova",
      "Histórico das conversas para revisar depois",
      "10 perguntas por dia enquanto a sua IA estiver ativa",
    ],
  },
  {
    icone: Stethoscope,
    selo: "Novo · Gestão",
    titulo: "Consultório",
    texto: "Um consultório de bolso dentro da plataforma: organize atendimentos, pacientes, o caixa e as provas do semestre num lugar só.",
    itens: [
      "Agenda da semana com linha do tempo do dia",
      "Cadastro de pacientes com busca",
      "Caixa com entradas, saídas e saldo do mês",
      "Contagem regressiva para as provas",
    ],
  },
];

const PASSOS = [
  { icone: PenLine, titulo: "Crie sua conta", texto: "Escolha Pix ou cartão em até 12x. O acesso é liberado assim que o pagamento é confirmado." },
  { icone: Brain, titulo: "Estude por disciplina", texto: "Vídeos, resumos, mapas mentais e flashcards organizados por período e matéria." },
  { icone: ChartColumn, titulo: "Treine e acompanhe", texto: "Faça simulados, receba a correção comentada e reforce onde você errou." },
];

const DUVIDAS = [
  {
    pergunta: "O acesso é vitalício?",
    resposta:
      "Sim. Tudo o que for publicado até 12 meses depois da sua compra fica seu para sempre. Durante esses 12 meses você também recebe todas as novidades (disciplinas e aulas novas) e usa a IA. Depois, pode renovar para continuar recebendo novidades e usando a IA.",
  },
  {
    pergunta: "Como funciona a correção por IA?",
    resposta:
      "O professor define o gabarito e os critérios de cada questão discursiva. A IA compara sua resposta com esses critérios, dá a nota de cada um e explica o que você acertou e o que faltou. Se discordar, você pode pedir a revisão do professor.",
  },
  {
    pergunta: "Como funciona o chat de dúvidas?",
    resposta:
      "Você pergunta qualquer coisa de Odontologia e a IA responde na hora, de forma didática. São 10 perguntas por dia enquanto a IA do seu acesso estiver ativa (12 meses após a compra ou a renovação). A IA pode errar: confira sempre com o material e o professor.",
  },
  {
    pergunta: "O que é o Consultório?",
    resposta:
      "É uma área de organização dentro da plataforma: agenda de atendimentos, cadastro de pacientes, caixa com entradas e saídas e a contagem regressiva das suas provas. Vem junto com o seu acesso, sem custo extra.",
  },
  {
    pergunta: "Quais as formas de pagamento?",
    resposta: `À vista por ${formatarReais(PRECO.aVistaCentavos)} no Pix ou cartão, ou em até ${PRECO.parcelas}x de ${formatarReais(PRECO.parcelaCentavos)} sem juros no cartão de crédito. O pagamento é processado pelo Asaas.`,
  },
  {
    pergunta: "O certificado vale como hora complementar?",
    resposta:
      "O certificado é de curso livre, com a carga horária da disciplina. Cada faculdade decide o que aceita como atividade complementar — vale confirmar com a coordenação do seu curso.",
  },
  {
    pergunta: "Posso estudar pelo celular?",
    resposta: "Sim. A plataforma funciona no navegador do celular, do tablet e do computador.",
  },
  {
    pergunta: "E se eu me arrepender?",
    resposta: "Você tem 7 dias após a compra para desistir e receber o valor de volta, como garante o Código de Defesa do Consumidor.",
  },
];

/** Rótulo em mono, como nos carrosséis ("LAB 01 · RECURSOS"). */
function Rotulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`rotulo text-xs font-semibold ${className}`}>{children}</p>;
}

export default function Inicio() {
  const desconto = Math.round((1 - PRECO.aVistaCentavos / totalParcelado()) * 100);

  return (
    <Movimento>
      <div className="relative flex-1 overflow-x-clip bg-papel">
        {/* Topo violeta quadriculado, como a capa dos carrosséis */}
        <div className="grade-violeta text-white">
          <CabecalhoLanding />

          {/* Hero: animação só em CSS, para o título aparecer no primeiro desenho da página (LCP) */}
          <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-10 md:pt-16 lg:grid-cols-2">
            <div className="space-y-7">
              <div className="entrar flex flex-wrap items-center gap-3">
                <span className="rotulo rounded-md bg-tinta px-2.5 py-1 text-xs font-bold text-lima">Lab 01</span>
                <span className="rotulo text-xs font-medium text-white/90">Graduação em Odontologia</span>
              </div>
              <div className="subir [animation-delay:50ms]">
                <h1 className="text-[2.75rem] leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-[4rem]">
                  Passe nas provas da faculdade com <span className="text-lima">quem entende de Odontologia.</span>
                </h1>
              </div>
              <div className="entrar [animation-delay:100ms]">
                <p className="max-w-xl text-lg text-white/90 sm:text-xl">
                  Cada tema é um experimento: um resumo de bolso, flashcards, videoaulas, simulados com IA que corrige
                  suas respostas como um professor, um chat para tirar dúvidas e o Consultório para organizar sua rotina.
                </p>
              </div>
              <div className="entrar flex flex-wrap gap-3 [animation-delay:150ms]">
                <Button variant="destaque" size="lg" className="h-12 rounded-full px-6 text-base" asChild>
                  <Link href="/assinar">
                    Começar agora <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>
              <div className="entrar [animation-delay:200ms]">
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-lima" /> Acesso vitalício
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-lima" /> Pix ou 12x sem juros
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-lima" /> 7 dias para desistir
                  </span>
                </p>
              </div>
            </div>
            <div>
              <PreviaProduto />
            </div>
          </section>
        </div>

        <main className="relative">
          {/* Recursos */}
          <section id="recursos" className="fundo-marca scroll-mt-20 py-24">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <Surgir className="max-w-2xl space-y-3">
                <Rotulo className="text-violeta">Fig. 01 · Recursos</Rotulo>
                <h2 className="text-4xl font-extrabold tracking-tight text-tinta sm:text-5xl">Tudo para estudar em um só lugar</h2>
                <p className="text-lg text-slate-600">Organizado por disciplina e período, do jeito que a faculdade cobra.</p>
              </Surgir>
              <SurgirLista className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {RECURSOS.map(({ icone: Icone, titulo, texto, destaque, largo }, i) => (
                  <SurgirItem
                    key={titulo}
                    className={destaque ? "sm:col-span-2" : largo ? "sm:col-span-2 lg:col-span-3" : ""}
                  >
                    <div
                      className={`group h-full rounded-2xl border-2 border-tinta p-6 transition-transform hover:-translate-y-1 ${
                        destaque ? "bg-violeta text-white" : "bg-white"
                      }`}
                    >
                      <div className="mb-5 flex items-start justify-between">
                        <div className="inline-flex size-11 items-center justify-center rounded-xl border-2 border-tinta bg-lima text-tinta">
                          <Icone className="size-5" />
                        </div>
                        <span className={`rotulo text-xs ${destaque ? "text-white/80" : "text-slate-500"}`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className={`font-extrabold tracking-tight ${destaque ? "text-2xl" : "text-xl text-tinta"}`}>{titulo}</h3>
                      <p className={`mt-2 leading-relaxed ${destaque ? "text-white/90" : "text-slate-600"}`}>{texto}</p>
                      {destaque && (
                        <ul className="mt-6 grid gap-2 text-sm text-white/90 sm:grid-cols-2">
                          <li className="flex gap-2"><Check className="size-4 shrink-0 text-lima" /> Nota por critério da rubrica do professor</li>
                          <li className="flex gap-2"><Check className="size-4 shrink-0 text-lima" /> Comentários e o que faltou citar</li>
                          <li className="flex gap-2"><Check className="size-4 shrink-0 text-lima" /> Prioriza as questões que você errou</li>
                          <li className="flex gap-2"><Check className="size-4 shrink-0 text-lima" /> Revisão do professor se você discordar</li>
                        </ul>
                      )}
                    </div>
                  </SurgirItem>
                ))}
              </SurgirLista>
            </div>
          </section>

          {/* Novidades */}
          <section id="novidades" className="scroll-mt-20 border-t-2 border-tinta bg-tinta py-24 text-white">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <Surgir className="max-w-2xl space-y-3">
                <Rotulo className="text-lima">Fig. 02 · Novidades</Rotulo>
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Agora com chat de dúvidas e um consultório de bolso</h2>
                <p className="text-lg text-white/80">Duas ferramentas novas, incluídas no seu acesso.</p>
              </Surgir>
              <SurgirLista className="grid gap-6 lg:grid-cols-2">
                {NOVIDADES.map(({ icone: Icone, selo, titulo, texto, itens }) => (
                  <SurgirItem key={titulo}>
                    <div className="flex h-full flex-col rounded-2xl border-2 border-white/15 bg-white/5 p-6 transition-transform hover:-translate-y-1 sm:p-8">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="inline-flex size-12 items-center justify-center rounded-xl border-2 border-tinta bg-lima text-tinta">
                          <Icone className="size-6" />
                        </div>
                        <span className="rotulo rounded-md bg-violeta px-2.5 py-1 text-[11px] font-bold">{selo}</span>
                      </div>
                      <h3 className="text-2xl font-extrabold tracking-tight">{titulo}</h3>
                      <p className="mt-2 leading-relaxed text-white/80">{texto}</p>
                      <ul className="mt-6 grid gap-2 text-sm text-white/90 sm:grid-cols-2">
                        {itens.map((item) => (
                          <li key={item} className="flex gap-2">
                            <Check className="size-4 shrink-0 text-lima" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </SurgirItem>
                ))}
              </SurgirLista>
              <Surgir>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icone: CalendarDays, texto: "Agenda semanal e consultas do dia" },
                    { icone: Users, texto: "Pacientes organizados e fáceis de achar" },
                    { icone: Wallet, texto: "Entradas, saídas e saldo sempre à mão" },
                  ].map(({ icone: Icone, texto }) => (
                    <p key={texto} className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/90">
                      <Icone className="size-5 shrink-0 text-lima" /> {texto}
                    </p>
                  ))}
                </div>
              </Surgir>
            </div>
          </section>

          {/* Como funciona */}
          <section id="como-funciona" className="scroll-mt-20 border-y-2 border-tinta bg-white py-24">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <Surgir className="max-w-2xl space-y-3">
                <Rotulo className="text-violeta">Fig. 03 · Como funciona</Rotulo>
                <h2 className="text-4xl font-extrabold tracking-tight text-tinta sm:text-5xl">Em poucos minutos você já está estudando</h2>
              </Surgir>
              <SurgirLista className="grid gap-6 md:grid-cols-3">
                {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
                  <SurgirItem key={titulo} className="space-y-4">
                    {/* Selo no estilo da tabela periódica, como na capa dos carrosséis */}
                    <div className="flex size-24 flex-col justify-between rounded-2xl border-2 border-tinta bg-lima p-3 text-tinta">
                      <span className="rotulo text-[11px] font-bold">{String(i + 1).padStart(2, "0")}</span>
                      <Icone className="size-7" />
                    </div>
                    <Rotulo className="text-violeta">Passo {i + 1}</Rotulo>
                    <h3 className="text-2xl font-extrabold tracking-tight text-tinta">{titulo}</h3>
                    <p className="leading-relaxed text-slate-600">{texto}</p>
                  </SurgirItem>
                ))}
              </SurgirLista>

              <Surgir>
                <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-tinta bg-papel p-6 text-center sm:flex-row sm:text-left">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violeta text-white">
                    <Stethoscope className="size-5" />
                  </div>
                  <p className="text-slate-700">
                    <strong className="text-tinta">Conteúdo criado e revisado por um cirurgião-dentista de referência.</strong>{" "}
                    As questões geradas com ajuda da IA só entram nos simulados depois da revisão do professor.
                  </p>
                </div>
              </Surgir>
            </div>
          </section>

          {/* Preço */}
          <section id="preco" className="fundo-marca scroll-mt-20 py-24">
            <div className="mx-auto max-w-6xl space-y-10 px-4">
              <Surgir className="mx-auto max-w-2xl space-y-3 text-center">
                <Rotulo className="text-violeta">Fig. 04 · Preço</Rotulo>
                <h2 className="text-4xl font-extrabold tracking-tight text-tinta sm:text-5xl">Um pagamento, acesso para sempre</h2>
                <p className="text-lg text-slate-600">Sem mensalidade. Pague uma vez e estude no seu ritmo.</p>
              </Surgir>
              <Surgir className="mx-auto max-w-md">
                <div className="relative rounded-3xl border-2 border-tinta bg-white p-8 shadow-[8px_8px_0_0_var(--color-tinta)]">
                  <span className="rotulo absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-md border-2 border-tinta bg-lima px-3 py-1 text-xs font-bold whitespace-nowrap text-tinta">
                    Acesso completo
                  </span>
                  <p className="text-center font-heading text-5xl font-extrabold tracking-tight text-tinta">
                    {PRECO.parcelas}x <span className="text-violeta">{formatarReais(PRECO.parcelaCentavos)}</span>
                  </p>
                  <p className="mt-1 text-center text-sm text-slate-500">
                    sem juros no cartão · total {formatarReais(totalParcelado())}
                  </p>
                  <p className="mt-4 text-center text-lg text-tinta">
                    ou <strong>{formatarReais(PRECO.aVistaCentavos)}</strong> à vista
                    <Badge variant="secondary" className="rotulo ml-2 align-middle text-[10px]">{desconto}% off</Badge>
                  </p>
                  <ul className="mt-8 space-y-3 text-slate-700">
                    {[
                      "Acesso vitalício ao conteúdo",
                      "Novas disciplinas e aulas por 12 meses",
                      "Simulados e correção por IA por 12 meses",
                      "Chat de dúvidas com IA (10 perguntas por dia) por 12 meses",
                      "Consultório: agenda, pacientes, caixa e provas",
                      "Flashcards com repetição espaçada",
                      "Certificado por disciplina",
                    ].map((item) => (
                      <li key={item} className="flex gap-3">
                        <Check className="size-5 shrink-0 text-violeta" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-8 h-12 w-full rounded-full text-base" asChild>
                    <Link href="/assinar">
                      Quero começar <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <ShieldCheck className="size-4" /> Pagamento seguro · Pix ou cartão · 7 dias para desistir
                  </p>
                </div>
              </Surgir>
            </div>
          </section>

          {/* Dúvidas */}
          <section id="duvidas" className="scroll-mt-20 border-t-2 border-tinta bg-white py-24">
            <div className="mx-auto max-w-3xl space-y-10 px-4">
              <Surgir className="space-y-3 text-center">
                <Rotulo className="text-violeta">Fig. 05 · Dúvidas</Rotulo>
                <h2 className="text-4xl font-extrabold tracking-tight text-tinta sm:text-5xl">Dúvidas frequentes</h2>
              </Surgir>
              <Surgir>
                <Accordion type="single" collapsible className="rounded-2xl border-2 border-tinta bg-white px-6">
                  {DUVIDAS.map((d) => (
                    <AccordionItem key={d.pergunta} value={d.pergunta}>
                      <AccordionTrigger className="text-base font-semibold">{d.pergunta}</AccordionTrigger>
                      <AccordionContent className="text-slate-600">{d.resposta}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Surgir>
            </div>
          </section>

          {/* Chamada final: o "Resumo de bolso" dos carrosséis, em Lima */}
          <section className="bg-white px-4 pb-24">
            <Surgir className="mx-auto max-w-6xl">
              <div
                className="relative overflow-hidden rounded-3xl border-2 border-tinta bg-lima px-6 py-16 text-center text-tinta"
                style={{
                  backgroundImage:
                    "linear-gradient(rgb(18 18 28 / 7%) 1px, transparent 1px), linear-gradient(90deg, rgb(18 18 28 / 7%) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              >
                <div className="relative space-y-5">
                  <Rotulo>Resumo de bolso</Rotulo>
                  <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Sua próxima prova começa hoje</h2>
                  <p className="mx-auto max-w-xl text-lg">
                    Estude com método, treine com simulados e chegue na prova sabendo onde você precisa melhorar.
                  </p>
                  <Button size="lg" className="h-12 rounded-full bg-tinta px-6 text-base text-white hover:bg-tinta/85" asChild>
                    <Link href="/assinar">
                      Começar agora <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Surgir>
          </section>
        </main>

        <footer className="border-t-2 border-tinta bg-papel py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-600 sm:flex-row">
            <span className="flex flex-col items-center gap-1.5 sm:items-start">
              <Logo tamanho="sm" />
              <span className="rotulo text-[10px]">O laboratório de estudos da Odontologia</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="size-4" /> Estude no celular, tablet ou computador
            </span>
            <Link href="/entrar" className="font-medium hover:text-tinta">
              Área do aluno
            </Link>
          </div>
        </footer>
      </div>
    </Movimento>
  );
}
