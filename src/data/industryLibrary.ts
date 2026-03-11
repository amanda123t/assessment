/**
 * Industry Process Library
 *
 * Implements the 4-level APQC PCF-inspired hierarchy:
 *   Industry → Macroprocess → Process → Subprocess
 *
 * Architecture:
 *   - Base macroprocesses (cross-industry) live in processLibrary.json and are
 *     always included regardless of industry selection.
 *   - Each industry adds its own macroprocesses on top of the base set.
 *   - Helper functions combine base + industry-specific macroprocesses at runtime.
 */

import { Industry, Macroprocess, Process, Subprocess } from '@/types';
import { processLibrary } from './processLibrary';

// ── Manufatura ────────────────────────────────────────────────────────────────

const manufaturaMacroprocesses: Macroprocess[] = [
  {
    id: 'mfg-pp',
    name: 'Planejamento de Produção',
    icon: '🏭',
    processes: [
      {
        id: 'mfg-pp-dem',
        name: 'Planejamento de Demanda',
        subprocesses: [
          { id: 'mfg-pp-01', code: 'MFG-PP-01', name: 'Consolidar previsões de demanda',     process: 'Planejamento de Demanda',             macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
      {
        id: 'mfg-pp-mps',
        name: 'Planejamento Mestre de Produção',
        subprocesses: [
          { id: 'mfg-pp-02', code: 'MFG-PP-02', name: 'Gerar plano mestre de produção',       process: 'Planejamento Mestre de Produção',      macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
      {
        id: 'mfg-pp-mrp',
        name: 'Planejamento de Materiais',
        subprocesses: [
          { id: 'mfg-pp-03', code: 'MFG-PP-03', name: 'Calcular necessidades de materiais',   process: 'Planejamento de Materiais',            macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
      {
        id: 'mfg-pp-seq',
        name: 'Sequenciamento de Produção',
        subprocesses: [
          { id: 'mfg-pp-04', code: 'MFG-PP-04', name: 'Programar ordens de produção',         process: 'Sequenciamento de Produção',           macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
    ],
  },
  {
    id: 'mfg-pr',
    name: 'Produção',
    icon: '⚙️',
    processes: [
      {
        id: 'mfg-pr-ord',
        name: 'Gestão de Ordens de Produção',
        subprocesses: [
          { id: 'mfg-pr-01', code: 'MFG-PR-01', name: 'Criar ordem de produção',              process: 'Gestão de Ordens de Produção',         macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-02', code: 'MFG-PR-02', name: 'Liberar ordem para produção',          process: 'Gestão de Ordens de Produção',         macroprocess: 'Produção', category: 'Manufacturing Execution' },
        ],
      },
      {
        id: 'mfg-pr-exe',
        name: 'Execução da Produção',
        subprocesses: [
          { id: 'mfg-pr-03', code: 'MFG-PR-03', name: 'Apontamento de produção',              process: 'Execução da Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-04', code: 'MFG-PR-04', name: 'Registrar consumo de materiais',       process: 'Execução da Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-05', code: 'MFG-PR-05', name: 'Registrar produção concluída',         process: 'Execução da Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
        ],
      },
      {
        id: 'mfg-pr-ctrl',
        name: 'Controle de Produção',
        subprocesses: [
          { id: 'mfg-pr-06', code: 'MFG-PR-06', name: 'Monitorar indicadores de produção',    process: 'Controle de Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-07', code: 'MFG-PR-07', name: 'Registrar parada de linha',            process: 'Controle de Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
        ],
      },
    ],
  },
  {
    id: 'mfg-qa',
    name: 'Qualidade',
    icon: '✅',
    processes: [
      {
        id: 'mfg-qa-insp',
        name: 'Inspeção de Qualidade',
        subprocesses: [
          { id: 'mfg-qa-01', code: 'MFG-QA-01', name: 'Registrar inspeção de produto',        process: 'Inspeção de Qualidade',                macroprocess: 'Qualidade', category: 'Quality Management' },
        ],
      },
      {
        id: 'mfg-qa-nc',
        name: 'Gestão de Não Conformidades',
        subprocesses: [
          { id: 'mfg-qa-02', code: 'MFG-QA-02', name: 'Registrar não conformidade',           process: 'Gestão de Não Conformidades',          macroprocess: 'Qualidade', category: 'Quality Management' },
          { id: 'mfg-qa-03', code: 'MFG-QA-03', name: 'Abrir ação corretiva',                 process: 'Gestão de Não Conformidades',          macroprocess: 'Qualidade', category: 'Quality Management' },
          { id: 'mfg-qa-04', code: 'MFG-QA-04', name: 'Validar ação corretiva',               process: 'Gestão de Não Conformidades',          macroprocess: 'Qualidade', category: 'Quality Management' },
        ],
      },
      {
        id: 'mfg-qa-aud',
        name: 'Auditorias de Qualidade',
        subprocesses: [
          { id: 'mfg-qa-05', code: 'MFG-QA-05', name: 'Planejar auditoria de qualidade',      process: 'Auditorias de Qualidade',              macroprocess: 'Qualidade', category: 'Quality Management' },
          { id: 'mfg-qa-06', code: 'MFG-QA-06', name: 'Registrar resultado de auditoria',     process: 'Auditorias de Qualidade',              macroprocess: 'Qualidade', category: 'Quality Management' },
        ],
      },
    ],
  },
  {
    id: 'mfg-mn',
    name: 'Manutenção',
    icon: '🔧',
    processes: [
      {
        id: 'mfg-mn-prev',
        name: 'Manutenção Preventiva',
        subprocesses: [
          { id: 'mfg-mn-01', code: 'MFG-MN-01', name: 'Criar ordem de manutenção',            process: 'Manutenção Preventiva',                macroprocess: 'Manutenção', category: 'Asset Maintenance' },
          { id: 'mfg-mn-02', code: 'MFG-MN-02', name: 'Planejar manutenção preventiva',       process: 'Manutenção Preventiva',                macroprocess: 'Manutenção', category: 'Asset Maintenance' },
        ],
      },
      {
        id: 'mfg-mn-corr',
        name: 'Manutenção Corretiva',
        subprocesses: [
          { id: 'mfg-mn-03', code: 'MFG-MN-03', name: 'Registrar execução de manutenção',     process: 'Manutenção Corretiva',                 macroprocess: 'Manutenção', category: 'Asset Maintenance' },
          { id: 'mfg-mn-04', code: 'MFG-MN-04', name: 'Registrar parada de máquina',          process: 'Manutenção Corretiva',                 macroprocess: 'Manutenção', category: 'Asset Maintenance' },
        ],
      },
      {
        id: 'mfg-mn-atv',
        name: 'Gestão de Ativos',
        subprocesses: [
          { id: 'mfg-mn-05', code: 'MFG-MN-05', name: 'Cadastrar ativo produtivo',            process: 'Gestão de Ativos',                     macroprocess: 'Manutenção', category: 'Asset Maintenance' },
          { id: 'mfg-mn-06', code: 'MFG-MN-06', name: 'Atualizar histórico de manutenção',    process: 'Gestão de Ativos',                     macroprocess: 'Manutenção', category: 'Asset Maintenance' },
        ],
      },
    ],
  },
];

// ── Varejo ────────────────────────────────────────────────────────────────────

const varejoMacroprocesses: Macroprocess[] = [
  {
    id: 'ret-gp',
    name: 'Gestão de Produtos',
    icon: '🏷️',
    processes: [
      {
        id: 'ret-gp-cad',
        name: 'Cadastro de Produtos',
        subprocesses: [
          { id: 'ret-gp-01', code: 'RET-GP-01', name: 'Criar cadastro de produto',             process: 'Cadastro de Produtos',                 macroprocess: 'Gestão de Produtos', category: 'Product Management' },
          { id: 'ret-gp-02', code: 'RET-GP-02', name: 'Atualizar descrição de produto',        process: 'Cadastro de Produtos',                 macroprocess: 'Gestão de Produtos', category: 'Product Management' },
        ],
      },
      {
        id: 'ret-gp-prec',
        name: 'Gestão de Preços',
        subprocesses: [
          { id: 'ret-gp-03', code: 'RET-GP-03', name: 'Atualizar preço de produto',            process: 'Gestão de Preços',                     macroprocess: 'Gestão de Produtos', category: 'Product Management' },
          { id: 'ret-gp-04', code: 'RET-GP-04', name: 'Aplicar promoção ou desconto',          process: 'Gestão de Preços',                     macroprocess: 'Gestão de Produtos', category: 'Product Management' },
        ],
      },
      {
        id: 'ret-gp-cat',
        name: 'Gestão de Catálogo',
        subprocesses: [
          { id: 'ret-gp-05', code: 'RET-GP-05', name: 'Publicar produto em canais',            process: 'Gestão de Catálogo',                   macroprocess: 'Gestão de Produtos', category: 'Product Management' },
          { id: 'ret-gp-06', code: 'RET-GP-06', name: 'Inativar produto descontinuado',        process: 'Gestão de Catálogo',                   macroprocess: 'Gestão de Produtos', category: 'Product Management' },
        ],
      },
    ],
  },
  {
    id: 'ret-ol',
    name: 'Operações de Loja',
    icon: '🛒',
    processes: [
      {
        id: 'ret-ol-vnd',
        name: 'Gestão de Vendas',
        subprocesses: [
          { id: 'ret-ol-01', code: 'RET-OL-01', name: 'Registrar venda',                       process: 'Gestão de Vendas',                     macroprocess: 'Operações de Loja', category: 'Store Operations' },
          { id: 'ret-ol-02', code: 'RET-OL-02', name: 'Processar pagamento de venda',          process: 'Gestão de Vendas',                     macroprocess: 'Operações de Loja', category: 'Store Operations' },
        ],
      },
      {
        id: 'ret-ol-cx',
        name: 'Gestão de Caixa',
        subprocesses: [
          { id: 'ret-ol-03', code: 'RET-OL-03', name: 'Abertura de caixa',                     process: 'Gestão de Caixa',                      macroprocess: 'Operações de Loja', category: 'Store Operations' },
          { id: 'ret-ol-04', code: 'RET-OL-04', name: 'Fechamento de caixa',                   process: 'Gestão de Caixa',                      macroprocess: 'Operações de Loja', category: 'Store Operations' },
        ],
      },
      {
        id: 'ret-ol-rep',
        name: 'Reposição de Estoque',
        subprocesses: [
          { id: 'ret-ol-05', code: 'RET-OL-05', name: 'Solicitar reposição',                   process: 'Reposição de Estoque',                 macroprocess: 'Operações de Loja', category: 'Store Operations' },
          { id: 'ret-ol-06', code: 'RET-OL-06', name: 'Registrar ruptura de estoque',          process: 'Reposição de Estoque',                 macroprocess: 'Operações de Loja', category: 'Store Operations' },
        ],
      },
    ],
  },
  {
    id: 'ret-gd',
    name: 'Gestão de Devoluções',
    icon: '↩️',
    processes: [
      {
        id: 'ret-gd-dev',
        name: 'Processamento de Devoluções',
        subprocesses: [
          { id: 'ret-gd-01', code: 'RET-GD-01', name: 'Registrar devolução',                   process: 'Processamento de Devoluções',          macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
          { id: 'ret-gd-02', code: 'RET-GD-02', name: 'Atualizar estoque devolvido',           process: 'Processamento de Devoluções',          macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
        ],
      },
      {
        id: 'ret-gd-troca',
        name: 'Gestão de Trocas',
        subprocesses: [
          { id: 'ret-gd-03', code: 'RET-GD-03', name: 'Autorizar troca',                       process: 'Gestão de Trocas',                     macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
          { id: 'ret-gd-04', code: 'RET-GD-04', name: 'Emitir reembolso',                      process: 'Gestão de Trocas',                     macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
        ],
      },
    ],
  },
];

// ── Bancos / Instituições Financeiras ─────────────────────────────────────────

const bancosMacroprocesses: Macroprocess[] = [
  {
    id: 'bnk-ob',
    name: 'Operações Bancárias',
    icon: '🏦',
    processes: [
      {
        id: 'bnk-ob-aber',
        name: 'Abertura de Contas',
        subprocesses: [
          { id: 'bnk-ob-01', code: 'BNK-OB-01', name: 'Receber documentação do cliente',       process: 'Abertura de Contas',                   macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-02', code: 'BNK-OB-02', name: 'Validar documentos',                    process: 'Abertura de Contas',                   macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-03', code: 'BNK-OB-03', name: 'Cadastrar cliente',                     process: 'Abertura de Contas',                   macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
        ],
      },
      {
        id: 'bnk-ob-gest',
        name: 'Gestão de Contas',
        subprocesses: [
          { id: 'bnk-ob-04', code: 'BNK-OB-04', name: 'Processar encerramento de conta',       process: 'Gestão de Contas',                     macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-05', code: 'BNK-OB-05', name: 'Bloquear / desbloquear conta',          process: 'Gestão de Contas',                     macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
        ],
      },
      {
        id: 'bnk-ob-cad',
        name: 'Atualização Cadastral',
        subprocesses: [
          { id: 'bnk-ob-06', code: 'BNK-OB-06', name: 'Atualizar cadastro de cliente',         process: 'Atualização Cadastral',                macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-07', code: 'BNK-OB-07', name: 'Validar atualização de dados',          process: 'Atualização Cadastral',                macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
        ],
      },
    ],
  },
  {
    id: 'bnk-gc',
    name: 'Gestão de Crédito',
    icon: '💳',
    processes: [
      {
        id: 'bnk-gc-anal',
        name: 'Análise de Crédito',
        subprocesses: [
          { id: 'bnk-gc-01', code: 'BNK-GC-01', name: 'Receber proposta de crédito',           process: 'Análise de Crédito',                   macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
          { id: 'bnk-gc-02', code: 'BNK-GC-02', name: 'Analisar score de crédito',             process: 'Análise de Crédito',                   macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
        ],
      },
      {
        id: 'bnk-gc-form',
        name: 'Formalização de Contratos',
        subprocesses: [
          { id: 'bnk-gc-03', code: 'BNK-GC-03', name: 'Emitir contrato de crédito',            process: 'Formalização de Contratos',            macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
          { id: 'bnk-gc-04', code: 'BNK-GC-04', name: 'Coletar assinatura do contrato',        process: 'Formalização de Contratos',            macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
        ],
      },
      {
        id: 'bnk-gc-gar',
        name: 'Gestão de Garantias',
        subprocesses: [
          { id: 'bnk-gc-05', code: 'BNK-GC-05', name: 'Registrar garantia',                    process: 'Gestão de Garantias',                  macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
          { id: 'bnk-gc-06', code: 'BNK-GC-06', name: 'Monitorar vencimento de garantia',      process: 'Gestão de Garantias',                  macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
        ],
      },
    ],
  },
  {
    id: 'bnk-pg',
    name: 'Pagamentos',
    icon: '💸',
    processes: [
      {
        id: 'bnk-pg-proc',
        name: 'Processamento de Pagamentos',
        subprocesses: [
          { id: 'bnk-pg-01', code: 'BNK-PG-01', name: 'Receber ordem de pagamento',            process: 'Processamento de Pagamentos',          macroprocess: 'Pagamentos', category: 'Payment Processing' },
          { id: 'bnk-pg-02', code: 'BNK-PG-02', name: 'Processar pagamento',                   process: 'Processamento de Pagamentos',          macroprocess: 'Pagamentos', category: 'Payment Processing' },
        ],
      },
      {
        id: 'bnk-pg-liq',
        name: 'Liquidação Financeira',
        subprocesses: [
          { id: 'bnk-pg-03', code: 'BNK-PG-03', name: 'Liquidar transação',                    process: 'Liquidação Financeira',                macroprocess: 'Pagamentos', category: 'Payment Processing' },
          { id: 'bnk-pg-04', code: 'BNK-PG-04', name: 'Confirmar liquidação ao cliente',       process: 'Liquidação Financeira',                macroprocess: 'Pagamentos', category: 'Payment Processing' },
        ],
      },
      {
        id: 'bnk-pg-conc',
        name: 'Conciliação',
        subprocesses: [
          { id: 'bnk-pg-05', code: 'BNK-PG-05', name: 'Conciliar transações',                  process: 'Conciliação',                          macroprocess: 'Pagamentos', category: 'Payment Processing' },
          { id: 'bnk-pg-06', code: 'BNK-PG-06', name: 'Tratar divergências de conciliação',    process: 'Conciliação',                          macroprocess: 'Pagamentos', category: 'Payment Processing' },
        ],
      },
    ],
  },
  {
    id: 'bnk-co',
    name: 'Compliance Operacional',
    icon: '📋',
    processes: [
      {
        id: 'bnk-co-kyc',
        name: 'KYC e Prevenção à Lavagem',
        subprocesses: [
          { id: 'bnk-co-01', code: 'BNK-CO-01', name: 'Executar due diligence de cliente',     process: 'KYC e Prevenção à Lavagem',            macroprocess: 'Compliance Operacional', category: 'Compliance' },
          { id: 'bnk-co-02', code: 'BNK-CO-02', name: 'Monitorar transações suspeitas',        process: 'KYC e Prevenção à Lavagem',            macroprocess: 'Compliance Operacional', category: 'Compliance' },
        ],
      },
      {
        id: 'bnk-co-reg',
        name: 'Reporte Regulatório',
        subprocesses: [
          { id: 'bnk-co-03', code: 'BNK-CO-03', name: 'Preparar relatório regulatório',        process: 'Reporte Regulatório',                  macroprocess: 'Compliance Operacional', category: 'Compliance' },
          { id: 'bnk-co-04', code: 'BNK-CO-04', name: 'Enviar declaração ao regulador',        process: 'Reporte Regulatório',                  macroprocess: 'Compliance Operacional', category: 'Compliance' },
        ],
      },
    ],
  },
];

// ── Serviços / BPO ────────────────────────────────────────────────────────────

const servicosBpoMacroprocesses: Macroprocess[] = [
  {
    id: 'bpo-gc',
    name: 'Gestão de Contratos',
    icon: '📄',
    processes: [
      {
        id: 'bpo-gc-cad',
        name: 'Cadastro de Contratos',
        subprocesses: [
          { id: 'bpo-gc-01', code: 'BPO-GC-01', name: 'Registrar contrato',                    process: 'Cadastro de Contratos',                macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
          { id: 'bpo-gc-02', code: 'BPO-GC-02', name: 'Atualizar condições contratuais',       process: 'Cadastro de Contratos',                macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
        ],
      },
      {
        id: 'bpo-gc-vig',
        name: 'Gestão de Vigência',
        subprocesses: [
          { id: 'bpo-gc-03', code: 'BPO-GC-03', name: 'Notificar vencimento de contrato',      process: 'Gestão de Vigência',                   macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
          { id: 'bpo-gc-04', code: 'BPO-GC-04', name: 'Monitorar SLA contratual',              process: 'Gestão de Vigência',                   macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
        ],
      },
      {
        id: 'bpo-gc-ren',
        name: 'Renovação de Contratos',
        subprocesses: [
          { id: 'bpo-gc-05', code: 'BPO-GC-05', name: 'Renovar contrato',                      process: 'Renovação de Contratos',               macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
          { id: 'bpo-gc-06', code: 'BPO-GC-06', name: 'Registrar aditivo contratual',          process: 'Renovação de Contratos',               macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
        ],
      },
    ],
  },
  {
    id: 'bpo-os',
    name: 'Operações de Serviço',
    icon: '🛠️',
    processes: [
      {
        id: 'bpo-os-exe',
        name: 'Execução de Serviços',
        subprocesses: [
          { id: 'bpo-os-01', code: 'BPO-OS-01', name: 'Registrar solicitação de serviço',      process: 'Execução de Serviços',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
          { id: 'bpo-os-02', code: 'BPO-OS-02', name: 'Atribuir responsável',                  process: 'Execução de Serviços',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
        ],
      },
      {
        id: 'bpo-os-ent',
        name: 'Controle de Entregas',
        subprocesses: [
          { id: 'bpo-os-03', code: 'BPO-OS-03', name: 'Registrar execução',                    process: 'Controle de Entregas',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
          { id: 'bpo-os-04', code: 'BPO-OS-04', name: 'Validar entrega',                       process: 'Controle de Entregas',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
        ],
      },
      {
        id: 'bpo-os-sol',
        name: 'Gestão de Solicitações',
        subprocesses: [
          { id: 'bpo-os-05', code: 'BPO-OS-05', name: 'Priorizar fila de solicitações',        process: 'Gestão de Solicitações',               macroprocess: 'Operações de Serviço', category: 'Service Operations' },
          { id: 'bpo-os-06', code: 'BPO-OS-06', name: 'Escalar solicitação crítica',           process: 'Gestão de Solicitações',               macroprocess: 'Operações de Serviço', category: 'Service Operations' },
        ],
      },
    ],
  },
  {
    id: 'bpo-gp',
    name: 'Gestão de Projetos',
    icon: '📊',
    processes: [
      {
        id: 'bpo-gp-plan',
        name: 'Planejamento de Projetos',
        subprocesses: [
          { id: 'bpo-gp-01', code: 'BPO-GP-01', name: 'Criar escopo de projeto',               process: 'Planejamento de Projetos',             macroprocess: 'Gestão de Projetos', category: 'Project Management' },
          { id: 'bpo-gp-02', code: 'BPO-GP-02', name: 'Definir cronograma e marcos',           process: 'Planejamento de Projetos',             macroprocess: 'Gestão de Projetos', category: 'Project Management' },
        ],
      },
      {
        id: 'bpo-gp-mon',
        name: 'Monitoramento de Projetos',
        subprocesses: [
          { id: 'bpo-gp-03', code: 'BPO-GP-03', name: 'Atualizar status do projeto',           process: 'Monitoramento de Projetos',            macroprocess: 'Gestão de Projetos', category: 'Project Management' },
          { id: 'bpo-gp-04', code: 'BPO-GP-04', name: 'Registrar desvio de prazo ou custo',    process: 'Monitoramento de Projetos',            macroprocess: 'Gestão de Projetos', category: 'Project Management' },
        ],
      },
    ],
  },
];

// ── Industry definitions ───────────────────────────────────────────────────────

export const INDUSTRIES: Industry[] = [
  {
    id: 'manufatura',
    name: 'Manufatura',
    macroprocesses: manufaturaMacroprocesses,
  },
  {
    id: 'varejo',
    name: 'Varejo',
    macroprocesses: varejoMacroprocesses,
  },
  {
    id: 'bancos',
    name: 'Bancos / Instituições Financeiras',
    macroprocesses: bancosMacroprocesses,
  },
  {
    id: 'servicos-bpo',
    name: 'Serviços / BPO',
    macroprocesses: servicosBpoMacroprocesses,
  },
];

// ── Helper functions ───────────────────────────────────────────────────────────

/**
 * Returns the full list of macroprocesses for a given industry:
 * base (cross-industry) macroprocesses + industry-specific ones.
 *
 * Pass `null` or an unknown id to get only the base macroprocesses.
 */
export function getMacroprocessesForIndustry(industryId: string | null): Macroprocess[] {
  const industry = INDUSTRIES.find((i) => i.id === industryId);
  return [...processLibrary, ...(industry?.macroprocesses ?? [])];
}

/**
 * Returns every macroprocess — base + all industry-specific ones combined.
 * Useful for lookup functions that must resolve any subprocess id.
 */
export function getAllMacroprocesses(): Macroprocess[] {
  const industryMacros = INDUSTRIES.flatMap((i) => i.macroprocesses);
  return [...processLibrary, ...industryMacros];
}

/**
 * Finds and returns the full context (macroprocess + process + subprocess)
 * for a given subprocess id across the entire combined library.
 *
 * Drop-in replacement for local `lookupSubprocess` functions used in the
 * diagnostic pages, extended to cover industry-specific subprocesses.
 *
 * Returns `null` if not found.
 */
export function lookupSubprocessById(subprocessId: string): {
  macroprocess: Macroprocess;
  process: Process;
  subprocess: Subprocess;
} | null {
  for (const macro of getAllMacroprocesses()) {
    for (const process of macro.processes) {
      for (const subprocess of process.subprocesses) {
        if (subprocess.id === subprocessId) {
          return { macroprocess: macro, process, subprocess };
        }
      }
    }
  }
  return null;
}
