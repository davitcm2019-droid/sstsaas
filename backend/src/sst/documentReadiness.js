const SUPPORTED_STRICT_TYPES = new Set(['pgr', 'ltcat']);
const CRITICAL_LEVELS = new Set(['alto', 'critico']);

const normalizeText = (value) => String(value || '').trim();

const addMissingField = (missingFields, payload) => {
  missingFields.push({
    code: payload.code,
    section: payload.section,
    field: payload.field,
    message: payload.message,
    severity: payload.severity || 'blocking',
    blocking: true,
    assessmentId: payload.assessmentId || null,
    riskId: payload.riskId || null
  });
};

const hasValidActionItem = (item = {}) =>
  normalizeText(item.title) &&
  normalizeText(item.responsible) &&
  normalizeText(item.status);

const evaluateDocumentReadiness = ({ documentType, assessments = [], risksByAssessment = new Map(), conclusionsByAssessment = new Map() }) => {
  const strictMode = SUPPORTED_STRICT_TYPES.has(documentType);

  const missingFields = [];
  let riskCount = 0;
  let totalValidPlanActions = 0;

  assessments.forEach((assessment) => {
    const assessmentId = String(assessment?._id || assessment?.id || '');
    const conclusion = conclusionsByAssessment.get(assessmentId) || null;
    const context = assessment?.context || {};
    const risks = risksByAssessment.get(assessmentId) || [];

    if (assessment?.status !== 'published') {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_NOT_PUBLISHED',
        section: 'escopo',
        field: 'assessment.status',
        message: 'A avaliacao precisa estar publicada para emissao documental.',
        assessmentId
      });
    }

    if (!conclusion || conclusion?.status !== 'signed') {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_CONCLUSION_NOT_SIGNED',
        section: 'conclusao',
        field: 'conclusion.status',
        message: 'A conclusao tecnica precisa estar assinada.',
        assessmentId
      });
    }

    if (!normalizeText(assessment?.responsibleTechnical?.nome)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_RT_NAME_REQUIRED',
        section: 'avaliadores',
        field: 'responsibleTechnical.nome',
        message: 'Nome do responsavel tecnico obrigatorio.',
        assessmentId
      });
    }

    if (!normalizeText(assessment?.responsibleTechnical?.registro)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_RT_REGISTRATION_REQUIRED',
        section: 'avaliadores',
        field: 'responsibleTechnical.registro',
        message: 'Registro profissional do responsavel tecnico obrigatorio.',
        assessmentId
      });
    }

    if (!normalizeText(context.processoPrincipal)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_PROCESS_REQUIRED',
        section: 'contexto',
        field: 'context.processoPrincipal',
        message: 'Processo principal da avaliacao obrigatorio.',
        assessmentId
      });
    }

    if (!normalizeText(context.localAreaPosto)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_LOCATION_REQUIRED',
        section: 'contexto',
        field: 'context.localAreaPosto',
        message: 'Local/area/posto da avaliacao obrigatorio.',
        assessmentId
      });
    }

    if (!normalizeText(context.jornadaTurno)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_WORK_SHIFT_REQUIRED',
        section: 'contexto',
        field: 'context.jornadaTurno',
        message: 'Jornada/turno da avaliacao obrigatorio.',
        assessmentId
      });
    }

    if (!Number(context.quantidadeExpostos)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_EXPOSED_COUNT_REQUIRED',
        section: 'contexto',
        field: 'context.quantidadeExpostos',
        message: 'Quantidade de expostos deve ser maior que zero.',
        assessmentId
      });
    }

    if (!normalizeText(context.condicaoOperacional)) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_OPERATIONAL_CONDITION_REQUIRED',
        section: 'contexto',
        field: 'context.condicaoOperacional',
        message: 'Condicao operacional obrigatoria.',
        assessmentId
      });
    }

    if (!risks.length) {
      addMissingField(missingFields, {
        code: 'ASSESSMENT_RISKS_REQUIRED',
        section: 'inventario',
        field: 'risks',
        message: 'A avaliacao precisa ter pelo menos um risco registrado.',
        assessmentId
      });
    }

    if (documentType === 'pgr') {
      if (!normalizeText(context.criteriosAvaliacao)) {
        addMissingField(missingFields, {
          code: 'PGR_RISK_CRITERIA_REQUIRED',
          section: 'criterios_risco',
          field: 'context.criteriosAvaliacao',
          message: 'Criterios de risco obrigatorios para emissao do PGR.',
          assessmentId
        });
      }
      if (!normalizeText(context.matrizRisco)) {
        addMissingField(missingFields, {
          code: 'PGR_RISK_MATRIX_REQUIRED',
          section: 'matriz_risco',
          field: 'context.matrizRisco',
          message: 'Matriz de risco obrigatoria para emissao do PGR.',
          assessmentId
        });
      }
    }

    if (documentType === 'ltcat') {
      if (!normalizeText(context.metodologia)) {
        addMissingField(missingFields, {
          code: 'LTCAT_METHODOLOGY_REQUIRED',
          section: 'metodologia_avaliacoes',
          field: 'context.metodologia',
          message: 'Metodologia obrigatoria para emissao do LTCAT.',
          assessmentId
        });
      }
      if (!normalizeText(context.instrumentosUtilizados)) {
        addMissingField(missingFields, {
          code: 'LTCAT_INSTRUMENTS_REQUIRED',
          section: 'equipamentos_utilizados',
          field: 'context.instrumentosUtilizados',
          message: 'Instrumentos/equipamentos obrigatorios para emissao do LTCAT.',
          assessmentId
        });
      }
      if (!normalizeText(conclusion?.normativeFrame)) {
        addMissingField(missingFields, {
          code: 'LTCAT_NORMATIVE_FRAME_REQUIRED',
          section: 'conclusao',
          field: 'conclusion.normativeFrame',
          message: 'Enquadramento normativo obrigatorio para emissao do LTCAT.',
          assessmentId
        });
      }
    }

    risks.forEach((risk) => {
      riskCount += 1;
      const riskId = String(risk?._id || risk?.id || '');
      const riskPrefix = `Risco ${risk?.hazard || riskId || '#'}`;

      if (!normalizeText(risk?.factor)) {
        addMissingField(missingFields, {
          code: 'RISK_FACTOR_REQUIRED',
          section: 'inventario',
          field: 'risk.factor',
          message: `${riskPrefix}: fator obrigatorio.`,
          assessmentId,
          riskId
        });
      }
      if (!normalizeText(risk?.hazard)) {
        addMissingField(missingFields, {
          code: 'RISK_HAZARD_REQUIRED',
          section: 'inventario',
          field: 'risk.hazard',
          message: `${riskPrefix}: perigo obrigatorio.`,
          assessmentId,
          riskId
        });
      }
      if (!normalizeText(risk?.damage)) {
        addMissingField(missingFields, {
          code: 'RISK_DAMAGE_REQUIRED',
          section: 'inventario',
          field: 'risk.damage',
          message: `${riskPrefix}: dano potencial obrigatorio.`,
          assessmentId,
          riskId
        });
      }
      if (!Number(risk?.probability)) {
        addMissingField(missingFields, {
          code: 'RISK_PROBABILITY_REQUIRED',
          section: 'criterios_risco',
          field: 'risk.probability',
          message: `${riskPrefix}: probabilidade obrigatoria.`,
          assessmentId,
          riskId
        });
      }
      if (!Number(risk?.severity)) {
        addMissingField(missingFields, {
          code: 'RISK_SEVERITY_REQUIRED',
          section: 'criterios_risco',
          field: 'risk.severity',
          message: `${riskPrefix}: severidade obrigatoria.`,
          assessmentId,
          riskId
        });
      }
      if (!normalizeText(risk?.level)) {
        addMissingField(missingFields, {
          code: 'RISK_LEVEL_REQUIRED',
          section: 'criterios_risco',
          field: 'risk.level',
          message: `${riskPrefix}: nivel de risco obrigatorio.`,
          assessmentId,
          riskId
        });
      }

      const controls = Array.isArray(risk?.controls) ? risk.controls : [];
      const hasControls = controls.some((control) => normalizeText(control?.description));
      const hasJustification = normalizeText(risk?.highRiskJustification);
      if (!hasControls && !hasJustification) {
        addMissingField(missingFields, {
          code: 'RISK_CONTROLS_OR_JUSTIFICATION_REQUIRED',
          section: 'metas_prioridades_controle',
          field: 'risk.controls',
          message: `${riskPrefix}: informe controles ou justificativa tecnica.`,
          assessmentId,
          riskId
        });
      }

      if (documentType === 'pgr') {
        const actionPlanItems = Array.isArray(risk?.actionPlanItems) ? risk.actionPlanItems : [];
        const validActions = actionPlanItems.filter(hasValidActionItem);
        totalValidPlanActions += validActions.length;
        if (CRITICAL_LEVELS.has(normalizeText(risk?.level)) && validActions.length === 0 && !hasJustification) {
          addMissingField(missingFields, {
            code: 'PGR_HIGH_RISK_ACTION_REQUIRED',
            section: 'metas_prioridades_controle',
            field: 'risk.actionPlanItems',
            message: `${riskPrefix}: risco alto/critico exige acao com responsavel e status ou justificativa tecnica.`,
            assessmentId,
            riskId
          });
        }
      }

      if (documentType === 'ltcat') {
        if (!normalizeText(risk?.agent)) {
          addMissingField(missingFields, {
            code: 'LTCAT_RISK_AGENT_REQUIRED',
            section: 'analise_riscos_ambiente_trabalho',
            field: 'risk.agent',
            message: `${riskPrefix}: agente obrigatorio para emissao do LTCAT.`,
            assessmentId,
            riskId
          });
        }
        if (!normalizeText(risk?.source)) {
          addMissingField(missingFields, {
            code: 'LTCAT_RISK_SOURCE_REQUIRED',
            section: 'analise_riscos_ambiente_trabalho',
            field: 'risk.source',
            message: `${riskPrefix}: fonte geradora obrigatoria para emissao do LTCAT.`,
            assessmentId,
            riskId
          });
        }
      }
    });
  });

  if (documentType === 'pgr' && totalValidPlanActions === 0) {
    addMissingField(missingFields, {
      code: 'PGR_ACTION_PLAN_REQUIRED',
      section: 'metas_prioridades_controle',
      field: 'risk.actionPlanItems',
      message: 'PGR exige plano de acao com ao menos um item contendo titulo, responsavel e status.'
    });
  }

  return {
    emitible: missingFields.length === 0,
    blocking: missingFields.length > 0,
    missingFields,
      summary: {
        documentType,
        strictMode,
        assessments: assessments.length,
        risks: riskCount,
        missingFields: missingFields.length
      }
  };
};

module.exports = {
  SUPPORTED_STRICT_TYPES,
  evaluateDocumentReadiness
};
