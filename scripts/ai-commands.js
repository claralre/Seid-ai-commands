
const AI_COMMANDS = [
  {
    id: "rastreamento_processo",
    label: "Rastreamento do processo",
    prompt: `Com base no histórico de tramitação do processo, identifique:
1. A unidade atual que está com o processo.
2. Há quanto tempo o processo está nessa unidade.
3. Qual foi a última ação realizada (despacho, inclusão de documento, assinatura).
4. Se há alguma pendência ou bloqueio (documento aguardando assinatura, despacho aguardando resposta).
5. Qual é a próxima ação esperada e quem deve executá-la.

- Apresente um "Rastreamento do Processo" em formato de linha do tempo ou tabela.
- Destaque em negrito a unidade atual e o tempo de permanência.
- Indique claramente se há algum bloqueio ou pendência.
- Forneça a ação recomendada para desbloquear ou avançar o processo.

Foque apenas em informações objetivas e ações práticas.`
  },

  {
    id: "documentos_pendentes_assinatura",
    label: "Documentos pendentes de assinatura",
    prompt: `Analise o processo e identifique:
1. Se há documentos gerados (despachos, pareceres, ofícios) que ainda não foram assinados.
2. Quem é o responsável por assinar cada documento pendente (nome do servidor ou cargo).
3. Há quanto tempo cada documento está aguardando assinatura.
4. Se há algum bloco de assinatura criado e quem são os signatários.
5. Qual ação deve ser tomada para desbloquear o processo (notificar o signatário, ressignar a tarefa, etc.).

- Apresente uma lista de "Documentos Pendentes de Assinatura" com as colunas: "Tipo de Documento", "Responsável", "Tempo de Espera".
- Destaque documentos com mais de 5 dias de espera.
- Forneça uma ação recomendada: "Notificar [nome do servidor] para assinar o documento [tipo]".

Apenas identifique os bloqueios e oriente sobre como resolvê-los.`
  },

  {
    id: "relatorio_completo_processo",
    label: "Relatório completo do processo",
    prompt: `Analise o processo SEI fornecido e elabore um relatório completo estruturado que contenha:

1. **IDENTIFICAÇÃO DO PROCESSO**
- Número do processo SEI
- Tipo de processo
- Interessado/Requerente
- Data de abertura
- Unidade de origem

2. **RESUMO EXECUTIVO**
- Descrição clara e objetiva do que se trata o processo (em 2-3 frases)
- Objetivo/finalidade do requerimento
- Qual problema ou necessidade o processo visa resolver

3. **HISTÓRICO DE TRAMITAÇÃO**
- Linha do tempo das principais movimentações
- Unidades por onde o processo já passou
- Ações já realizadas
- Tempo total de tramitação até o momento

4. **STATUS ATUAL**
- Em qual unidade o processo está atualmente
- Há quanto tempo está nesta unidade
- Qual foi a última ação realizada
- Se há algum bloqueio ou impedimento

5. **ANÁLISE DOCUMENTAL**
- Lista de documentos anexados ao processo
- Lista de documentos obrigatórios faltantes
- Documentos presentes mas que precisam de correção
- Avaliação da qualidade e legibilidade

6. **ANÁLISE DE CONFORMIDADE**
- Verificação de fluxo conforme normas institucionais
- Identificação de desvios
- Verificação de prazos regulamentares

7. **PENDÊNCIAS IDENTIFICADAS**
- Documentos faltantes
- Assinaturas pendentes
- Pareceres técnicos necessários
- Encaminhamentos necessários
- Informações complementares
- Ajustes necessários
- Aprovações pendentes

8. **PRÓXIMOS PASSOS RECOMENDADOS**
- O que deve ser feito
- Quem deve fazer
- Quando deve ser feito
- Como fazer
- Orientações práticas, se aplicável

9. **PRAZO E URGÊNCIA**
- Prazo regulamentar
- Tempo restante
- Nível de urgência
- Consequências

10. **OBSERVAÇÕES E RECOMENDAÇÕES**
- Alertas importantes
- Riscos identificados
- Sugestões
- Contatos úteis

**Formato:**
- Use títulos e subtítulos em negrito
- Utilize tabelas
- Destaques de urgência apenas por texto
- Pendências em formato de checklist
- Cite números de documentos, datas e unidades sempre que possível
- Finalize com um resumo em uma linha: "Processo [APTO/PENDENTE/BLOQUEADO] - [X] ações necessárias"

**Regras:**
- Não invente informações
- Não omita pendências
- Baseie-se exclusivamente no processo
- Se algo não estiver claro, escreva: "[Informação não disponível no processo]".`
  },

  {
    id: "analise_completa_regras_rigidas",
    label: "Análise completa com regras rígidas",
    prompt: `### ATENÇÃO: Como Ler e Interpretar Informações do SEI

Ao analisar o processo fornecido, siga estas regras rigorosamente:

---

## 1. IDENTIFICAÇÃO DE ASSINATURAS PENDENTES

**Como identificar corretamente:**

a) Busque por:
- Blocos de assinatura criados
- Documentos com status "Aguardando assinatura"
- Marcação de pendência de assinatura
- Nomes específicos de signatários

b) Extraia EXATAMENTE o que está no processo:
- Nome completo
- Cargo
- Unidade
- Tipo de documento aguardando assinatura

c) Se NÃO estiver explícito:
- Não invente nomes
- Não invente cargos
- Indique: "[Nome do signatário não especificado no processo - verificar com a unidade responsável]"
- Ou: "[Documento aguardando assinatura - signatário a ser definido]"

---

## 2. IDENTIFICAÇÃO DE UNIDADES E RESPONSÁVEIS

a) Unidade atual:
- Extraia o nome EXATO, sem simplificar

b) Responsável:
- Cite o nome se houver
- Se houver apenas unidade: "Responsável: [Nome da Unidade] - servidor não especificado"
- Se não houver: "[Responsável não identificado no processo]"

---

## 3. ANÁLISE DE DOCUMENTOS

Para cada documento, extraia:
- Tipo de documento
- Número SEI
- Data de inclusão
- Quem incluiu
- Status de assinatura

Apresente em tabela, sem ícones.

---

## 4. HISTÓRICO DE TRAMITAÇÃO

Para cada movimentação, extraia:
- Data e hora
- Unidade de origem
- Unidade de destino
- Tipo de ação
- Responsável
- Observações

Apresente em tabela.

---

## 5. IDENTIFICAÇÃO DE BLOQUEIOS

Tipos de bloqueio a identificar:
- Documento aguardando assinatura
- Documentos obrigatórios faltantes
- Informações complementares pendentes
- Processo parado em unidade
- Prazo vencido ou próximo de vencer
- Despacho não atendido

Seja sempre específico.

---

## 6. EXTRAÇÃO DE PRAZOS

Procure por:
- Prazos em despachos
- Datas de vencimento
- Prazos regulamentares

Se não houver:
- Indique: "[Prazo regulamentar não especificado no processo]"

Calcule:
- Tempo decorrido
- Tempo restante
- Data limite

---

## TAREFA PRINCIPAL

Gerar um relatório estruturado contendo:

1. Identificação
2. Resumo executivo
3. Histórico completo
4. Status atual
5. Documentos
6. Conformidade
7. Pendências
8. Próximos passos
9. Prazos
10. Observações

Com tabelas e listas, sem ícones.

---

## REGRAS ABSOLUTAS

1. Nunca invente nomes
2. Nunca invente números
3. Nunca faça suposições
4. Nunca simplifique nomes de unidades
5. Nunca omita "[Informação não disponível no processo]"
6. Cite fontes quando possível
7. Seja específico
8. Indique datas
9. Calcule prazos corretamente
10. Diferencie fatos de recomendações

---

## FORMATO DE RESPOSTA

- Markdown
- Tabelas quando necessário
- Negrito para destaque
- Listas ordenadas para ações
- Texto claro e técnico

---

## EXEMPLO DE RESPOSTA CORRETA

"Documento aguarda assinatura:
- Tipo: Parecer Técnico
- Nº SEI: 12345
- Assinatura de: Professor João Carlos Silva
- Cargo: Coordenador do Curso
- Desde: 15/10/2025 (5 dias de espera)"

OU, se faltar informação:

"Documento aguarda assinatura:
- Tipo: Parecer Técnico
- Nº SEI: 12345
- Assinatura de: [Nome do signatário não especificado no processo]
- Unidade responsável: Coordenação do Curso
- Recomenda-se verificar com a unidade
- Desde: 15/10/2025 (5 dias de espera)"


Analise o processo fornecido seguindo rigorosamente todas estas instruções.`
  }
];
