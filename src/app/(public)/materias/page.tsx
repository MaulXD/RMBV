"use client";

import { useState } from "react";

type Nivel = "simples" | "detalhado" | "elaborado";

type Materia = {
  id: string;
  titulo: string;
  subtitulo: string;
  resumos: Record<Nivel, string[]>;
  fontes: { nome: string; url: string }[];
};

const NIVEIS: { id: Nivel; nome: string; dica: string }[] = [
  { id: "simples", nome: "Simples", dica: "Para mandar no WhatsApp" },
  { id: "detalhado", nome: "Detalhado", dica: "Para explicar com calma" },
  { id: "elaborado", nome: "Bem elaborado", dica: "Para quem quer entender tudo" },
];

const MATERIAS: Materia[] = [
  {
    id: "precatorios",
    titulo: "Precatórios e RPV",
    subtitulo: "Como a União paga o que perdeu na Justiça",
    resumos: {
      simples: [
        "Quando a pessoa ganha um processo contra a União, o dinheiro não sai na hora. O juiz manda o tribunal emitir uma ordem de pagamento.",
        "Se o valor for de até 60 salários mínimos, é uma RPV, paga em cerca de 60 dias. Acima disso, vira precatório e entra no orçamento de um ano seguinte.",
        "O precatório que chega ao tribunal até 1º de fevereiro entra no orçamento do ano seguinte. Depois dessa data, fica para um ano depois.",
      ],
      detalhado: [
        "Precatório é a ordem que o tribunal envia ao governo para pagar uma dívida reconhecida em processo que já terminou. RPV (requisição de pequeno valor) é a mesma coisa para valores menores. Na esfera federal, o limite da RPV é de 60 salários mínimos. Quem tem um crédito um pouco acima pode abrir mão do excedente para receber como RPV, que costuma sair em uns 60 dias.",
        "A Emenda Constitucional 136, de 2025, mudou o prazo de corte: agora o precatório precisa ser apresentado até 1º de fevereiro para entrar no orçamento do ano seguinte (antes era 2 de abril). O TRF2 dá um exemplo: precatório apresentado depois de 1º de fevereiro de 2026 deve ser pago até 31 de dezembro de 2028.",
        "A emenda também trocou a Selic por outro modelo de correção e juros. A constitucionalidade dela está em discussão no STF, na ADI 7873, então algumas regras podem mudar.",
      ],
      elaborado: [
        "Todo valor que a Fazenda Pública deve por decisão judicial definitiva segue a fila do artigo 100 da Constituição. O juiz da execução expede a requisição, o tribunal confere e envia ao órgão devedor, e o pagamento sai pelo orçamento. Para a União, os valores vão do Conselho da Justiça Federal aos TRFs, que depositam em conta judicial em nome do credor.",
        "Há duas vias. A RPV vale para créditos de até 60 salários mínimos contra a União e é paga em até 60 dias depois da requisição. O precatório vale para o que passa disso e depende da data em que chega ao tribunal. Com a EC 136/2025, a data de corte passou de 2 de abril para 1º de fevereiro. Quem perde o corte espera um ciclo orçamentário inteiro a mais.",
        "Idosos a partir de 60 anos, pessoas com doença grave e pessoas com deficiência têm prioridade e podem receber uma parte antes, até o triplo do limite da RPV. O resto segue a ordem normal. Créditos de natureza alimentar, como salário, aposentadoria e diferenças de remuneração de servidor, também passam na frente dos demais.",
        "A EC 136 trocou a Selic por um novo critério de correção e juros a partir da promulgação. Para contas com data-base anterior a setembro de 2025, a atualização segue a regra antiga até agosto de 2025 e a nova daí em diante. No orçamento federal, a emenda tirou os precatórios do limite de gastos primários em 2026. O estoque federal de 2026 fica perto de R$ 70 bilhões.",
        "O ponto que ainda pode mudar o cálculo é a ADI 7873, no STF, que questiona a emenda. Enquanto não houver julgamento, vale a regra nova. Quem tem crédito para receber deve conferir no site do TRF da sua região se a requisição já foi expedida e em qual ano orçamentário entrou.",
      ],
    },
    fontes: [
      { nome: "Câmara dos Deputados: promulgação da emenda", url: "https://www.camara.leg.br/noticias/1198404-congresso-nacional-promulga" },
      { nome: "TRF2: diferenças entre precatório e RPV", url: "https://trf2.jus.br/jfrj/artigo/especialidade-civel-previdenciaria/principais-diferencas-entre-precatorio-rpv" },
      { nome: "TRF6: EC 136 e prazo de inclusão", url: "https://portal.trf6.jus.br/?p=108129" },
      { nome: "Congresso em Foco: o que muda nos pagamentos", url: "https://www.congressoemfoco.com.br/noticia/111781/nova-emenda-dos-precatorios-entenda-o-que-muda-nos-pagamentos" },
    ],
  },
  {
    id: "2886",
    titulo: "Ação dos 28,86% (UFAL)",
    subtitulo: "Reajuste de 1993 dado aos militares e não aos civis",
    resumos: {
      simples: [
        "Em 1993 o governo deu 28,86% de aumento aos militares e não estendeu o mesmo índice aos servidores civis. A Justiça reconheceu que os civis também tinham direito.",
        "Na UFAL, servidores ganharam a ação e o valor entrou no contracheque como rubrica judicial. Em 2026 o governo pediu às universidades para absorver essa parcela, e o Sintufal e a Adufal contestam porque há decisão judicial que proíbe isso.",
        "Tem direito quem estava na ativa entre janeiro de 1993 e julho de 1998, além de aposentados e pensionistas desse período.",
      ],
      detalhado: [
        "As Leis 8.622 e 8.627, de 1993, deram aos militares um reajuste de 28,86%. Os servidores civis foram à Justiça dizendo que a Constituição exigia revisão geral igual para todos, e ganharam. O direito cobre o período de janeiro de 1993 a julho de 1998 e alcança técnicos-administrativos, docentes, aposentados e pensionistas.",
        "Na UFAL, o percentual foi incorporado aos salários por decisão judicial. Em 2008 houve um corte e o juízo da execução mandou não absorver os percentuais incorporados.",
        "Em 2026, o Ministério da Gestão (Ofício Circular SEI 852/2026/MGI) orientou a UFAL a absorver essas rubricas nos reajustes de carreira. A Adufal e o Sintufal responderam que a absorção fere a coisa julgada e que, no mínimo, teria de ter cálculo individual, nunca um corte automático. O tema também passou pelo TCU (Acórdão 1614/2019).",
      ],
      elaborado: [
        "O 28,86% nasceu de uma diferença de tratamento. Em 1993, as Leis 8.622 e 8.627 reajustaram a remuneração dos militares em 28,86% sem estender o índice aos civis. O STF entendeu que se tratava de revisão geral, que pela Constituição precisa ser igual para todos, e a Justiça passou a mandar pagar a diferença aos servidores civis, descontados os reajustes que alguns já tinham recebido.",
        "O período de direito vai de janeiro de 1993 a julho de 1998. Mesmo quando a ação é coletiva, a execução costuma ser individual e tem prazo. Herdeiros de servidor falecido podem habilitar-se para receber.",
        "Na UFAL, o percentual virou rubrica judicial no contracheque. Depois de um corte em 2008, o juízo da execução determinou que os percentuais incorporados não fossem absorvidos. O TCU tratou do assunto e fixou como regra geral a absorção pelos reajustes das leis de reestruturação de carreira dos últimos cinco anos, ressalvando os casos em que há decisão judicial expressa contra a absorção. No Acórdão 1614/2019, cobrou da UFAL providências sobre as rubricas mantidas.",
        "Em 2026, o MGI enviou o Ofício Circular SEI 852/2026 a várias universidades, a UFAL entre elas, orientando a absorção. A Adufal e o Sintufal pediram à reitoria que não aplique a medida aos servidores da UFAL, porque existe decisão vigente proibindo a absorção, e argumentam que qualquer compensação teria de ter critério de cálculo definido antes e análise caso a caso. Há ainda um grupo separado, o chamado URP 2º Grupo (RT 0157300-52.1989.5.19.0003, na Justiça do Trabalho), que segundo as entidades fica fora da absorção.",
        "Para o cliente, o que importa hoje: quem recebe a rubrica deve guardar contracheques e ficar atento a qualquer redução, e quem ainda não executou a sua parte deve verificar se o prazo de execução individual ainda está aberto antes de qualquer outra providência.",
      ],
    },
    fontes: [
      { nome: "Adufal e Sintufal: resposta ao Ofício SEI 852/2026 (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3569/resposta-ao-oficio-circular-sei-852-1-adufal-e-sintufal_9df3d217b0d3fe95311cb0c75e6562cc.pdf" },
      { nome: "Memorial ao TCU (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf" },
      { nome: "Reajuste de 28,86% para servidores de universidades federais", url: "https://ingracio.adv.br/reajuste-servidores-universidades-federais/" },
    ],
  },
  {
    id: "4794",
    titulo: "Ação dos 47,94% (UFAL)",
    subtitulo: "Índice de 1994 cobrado pela Adufal e pelo Sintufal",
    resumos: {
      simples: [
        "É uma ação de 1997 da Adufal e do Sintufal que pede um reajuste de 47,94% de março de 1994, ligado ao índice IRSM da época.",
        "O STJ manteve a decisão favorável aos servidores em 2023. Só que a UFAL entrou com uma ação rescisória no TRF5, e enquanto ela não for julgada nada é pago, nem atrasados nem o valor no contracheque.",
        "Para entrar, o servidor assina contrato e termo de adesão só pelos canais do sindicato. Ninguém deve pagar nada antecipado.",
      ],
      detalhado: [
        "O 47,94% corresponde à variação do IRSM aplicada no começo do Plano Real, com referência a março de 1994. O sindicato ajuizou a ação em 1997. Houve decisão definitiva favorável, primeiro para 91 servidores que estavam no processo, e depois as entidades passaram a executar para o conjunto da categoria.",
        "Em junho de 2023, o STJ negou o recurso da Procuradoria Federal, manteve a decisão do TRF5 e afastou o argumento de que o índice teria sido absorvido por reestruturação de carreira, porque essa questão já estava encerrada no processo.",
        "Depois disso a UFAL entrou com uma ação rescisória no TRF5 e conseguiu liminar. Em março de 2024, o TRF5 deixou a execução seguir (cálculo dos valores e expedição de precatórios), mas nenhum pagamento sai até o julgamento da rescisória. Não achamos nota pública mais recente das entidades sobre esse processo.",
      ],
      elaborado: [
        "O índice de 47,94% vem do IRSM e corresponde ao reajuste que, segundo os sindicatos, deixou de ser aplicado em março de 1994, no governo Itamar Franco, durante a conversão dos salários para a URV. A Adufal e o Sintufal ajuizaram a ação em 1997.",
        "O caso chegou a decisão definitiva em 2018, inicialmente para 91 servidores que figuravam no processo. Na fase de execução, a Procuradoria Federal levou ao STJ a tese de que o percentual teria sido absorvido pelas reestruturações de carreira. Em junho de 2023, o STJ rejeitou o recurso e disse que o ponto já estava precluso, mantendo a decisão do TRF5 favorável às entidades.",
        "A disputa não terminou ali. A UFAL ajuizou ação rescisória no TRF5, que busca desfazer a decisão definitiva, e obteve liminar. Em novembro de 2023 o TRF5 concedeu liminar no processo dos 47,94%. Em 18 de março de 2024, julgou em parte o agravo das entidades e mandou seguir os cumprimentos de sentença. Em 25 de março de 2024, o relator acolheu embargos das entidades e tirou parte do efeito da liminar favorável à UFAL.",
        "Na prática: os cálculos podem ser feitos e os precatórios expedidos, com os valores ficando à disposição do juízo, mas nada é liberado (retroativos ou implantação no contracheque) até o julgamento da rescisória. A Procuradoria segue defendendo a absorção, e há jurisprudência em outros casos dizendo que não existe direito adquirido ao 47,94% porque a MP 434/94 e a Lei 8.880/94 revogaram a Lei 8.676/93.",
        "Quem quer participar assina contrato advocatício e instrumento de adesão pelos canais oficiais do sindicato, e os honorários são retidos no pagamento. As entidades pedem cuidado com cobranças antecipadas e contratos de terceiros. A última nota pública que encontramos é de março de 2024, então vale confirmar o andamento com o Sintufal antes de passar previsão de pagamento ao cliente.",
      ],
    },
    fontes: [
      { nome: "Sintufal: nota jurídica sobre a ação dos 47,94%", url: "https://sintufal.org.br/conteudo/3198/nota-juridica-atualizacao-sobre-a-acao-dos" },
      { nome: "Adufal: informe jurídico de junho de 2023", url: "https://adufal.org.br/Conteudo/31394" },
      { nome: "Sintufal: informe sobre a ação", url: "https://sintufal.org.br/conteudo/3123/informe-sobre-a-atualizacao-da-acao-judicial-dos" },
    ],
  },
];

export default function MateriasPage() {
  const [materiaId, setMateriaId] = useState(MATERIAS[0].id);
  const [nivel, setNivel] = useState<Nivel>("simples");
  const [copiado, setCopiado] = useState(false);
  const materia = MATERIAS.find((m) => m.id === materiaId) ?? MATERIAS[0];
  const texto = materia.resumos[nivel];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${materia.titulo}\n\n${texto.join("\n\n")}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-sm font-medium text-blue-700">Base para atendimento</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Matérias para responder clientes</h1>
          <p className="mt-2 text-slate-600">
            Escolha o assunto e o tamanho do resumo. O botão Copiar leva o texto pronto para a conversa.
          </p>
        </header>

        <section className="mb-4">
          <label htmlFor="materia" className="mb-1 block text-sm font-medium">Trocar matéria</label>
          <div className="flex flex-wrap gap-2">
            {MATERIAS.map((m) => (
              <button
                key={m.id}
                id={m.id === materiaId ? "materia" : undefined}
                onClick={() => setMateriaId(m.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  m.id === materiaId
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-300 bg-white hover:border-blue-400"
                }`}
              >
                {m.titulo}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-3 gap-2" role="tablist">
          {NIVEIS.map((n) => (
            <button
              key={n.id}
              role="tab"
              aria-selected={n.id === nivel}
              onClick={() => setNivel(n.id)}
              className={`rounded-lg border p-3 text-left transition ${
                n.id === nivel ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
              }`}
            >
              <span className="block text-sm font-semibold">{n.nome}</span>
              <span className="hidden text-xs text-slate-500 sm:block">{n.dica}</span>
            </button>
          ))}
        </section>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{materia.titulo}</h2>
              <p className="text-sm text-slate-500">{materia.subtitulo}</p>
            </div>
            <button
              onClick={copiar}
              className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <div className="space-y-4 leading-relaxed">
            {texto.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <footer className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-600">Fontes</h3>
            <ul className="space-y-1 text-sm">
              {materia.fontes.map((f) => (
                <li key={f.url}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">
                    {f.nome}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        </article>

        <p className="mt-4 text-xs text-slate-500">
          Pesquisa feita em novembro de 2026. Antes de passar prazo ou valor ao cliente, confira o andamento no processo.
        </p>
      </div>
    </main>
  );
}
