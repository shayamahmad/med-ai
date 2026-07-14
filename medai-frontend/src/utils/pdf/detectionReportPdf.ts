import { ClassificationResult } from '../../types';
import { CDSReport } from '../../types/cds';
import {
  C,
  PdfCursor,
  addBulletList,
  addDisclaimerBox,
  addGradCamImage,
  addHighlightBox,
  addInfoCard,
  addMetaRow,
  addParagraph,
  addProgressBar,
  addSectionHeading,
  addStatCards,
  addSubheading,
  addWarningBox,
  createReportDoc,
  downloadPdf,
  finalizeDoc,
  slugifyFilename,
  urgencyStyle,
} from './pdfHelpers';

export interface DetectionReportMeta {
  modalityLabel: string;
  modalityId: string;
  architecture: string;
}

function severityStyle(category: string) {
  if (category === 'critical' || category === 'severe') return urgencyStyle('high');
  if (category === 'moderate') return urgencyStyle('medium');
  return urgencyStyle('low');
}

function addCdsReport(cursor: PdfCursor, report: CDSReport): void {
  const s = report.detection_summary;
  const pv = report.prediction_validation;
  const sev = report.severity_assessment;
  const tx = report.treatment_pathway;
  const fu = report.follow_up_plan;

  addSectionHeading(cursor, 'Clinical Decision Support Report', 4);
  addStatCards(cursor, [
    { label: 'Severity', value: sev.category.toUpperCase(), color: severityStyle(sev.category).text },
    { label: 'Confidence', value: `${s.confidence_percent}%`, color: C.accent },
    { label: 'Reliability', value: pv.reliability_level.replace(/_/g, ' '), color: C.purple },
  ]);

  if (report.low_confidence_advisory) {
    addHighlightBox(cursor, 'Low Confidence Advisory', report.low_confidence_advisory, urgencyStyle('medium'));
  }

  addSectionHeading(cursor, 'Detection Summary', 5);
  addHighlightBox(cursor, 'Predicted Condition', s.predicted_disease, {
    bg: C.cyanBg,
    border: C.accent,
    text: C.primary,
  });
  addMetaRow(cursor, 'AI confidence tier', s.confidence_tier, C.primary);

  if (s.key_imaging_findings?.length) {
    addSubheading(cursor, 'Key Imaging Findings', C.accent);
    addBulletList(cursor, s.key_imaging_findings, C.accent);
  }
  if (s.gradcam_interpretation) {
    addSubheading(cursor, 'Grad-CAM Interpretation', C.purple);
    addInfoCard(cursor, s.gradcam_interpretation);
  }
  if (s.differential_diagnoses?.length) {
    addSubheading(cursor, 'Differential Diagnoses', C.primary);
    s.differential_diagnoses.forEach(d => {
      const pct = d.probability_percent != null ? ` (${d.probability_percent}%)` : '';
      addHighlightBox(cursor, d.condition, `${pct}${d.rationale ? ` — ${d.rationale}` : ''}`.trim(), {
        bg: C.purpleLight,
        border: C.purple,
        text: C.purple,
      });
    });
  }

  addSectionHeading(cursor, 'Prediction Validation', 6);
  addHighlightBox(cursor, 'Validation Verdict', pv.validation_verdict, {
    bg: C.greenBg,
    border: C.greenBorder,
    text: C.green,
  });
  if (pv.verdict_explanation) addInfoCard(cursor, pv.verdict_explanation);
  if (pv.primary_diagnosis_justification) {
    addSubheading(cursor, 'Primary Diagnosis Justification', C.primary);
    addParagraph(cursor, pv.primary_diagnosis_justification);
  }
  if (pv.supporting_evidence?.length) {
    addSubheading(cursor, 'Supporting Evidence', C.green);
    addBulletList(cursor, pv.supporting_evidence, C.green);
  }
  if (pv.conflicting_evidence?.length) {
    addSubheading(cursor, 'Conflicting Evidence', C.amber);
    addBulletList(cursor, pv.conflicting_evidence, C.amber);
  }
  if (pv.gradcam_explainability) {
    addSubheading(cursor, 'Grad-CAM Explainability', C.purple);
    addInfoCard(cursor, pv.gradcam_explainability);
  }

  if (report.diagnostic_confirmation_tests?.length) {
    addSectionHeading(cursor, 'Recommended Diagnostic Tests', 7);
    addBulletList(cursor, report.diagnostic_confirmation_tests, C.primary);
  }

  addSectionHeading(cursor, 'Severity Assessment', 8);
  addInfoCard(cursor, sev.rationale);
  if (sev.influencing_factors?.length) {
    addSubheading(cursor, 'Influencing Factors', C.amber);
    addBulletList(cursor, sev.influencing_factors, C.amber);
  }

  addSectionHeading(cursor, 'Treatment Pathway', 9);
  if (tx.immediate_actions?.length) {
    addSubheading(cursor, 'Immediate Actions', C.red);
    addBulletList(cursor, tx.immediate_actions, C.red);
  }
  if (tx.first_line_management?.length) {
    addSubheading(cursor, 'First-line Management', C.green);
    addBulletList(cursor, tx.first_line_management, C.green);
  }
  if (tx.medication_classes?.length) {
    addSubheading(cursor, 'Medication Classes (Educational)', C.purple);
    tx.medication_classes.forEach(m => {
      addHighlightBox(cursor, m.category, m.purpose ?? 'Requires physician assessment', {
        bg: C.purpleLight,
        border: C.purple,
        text: C.purple,
      });
    });
  }
  if (tx.procedural_interventions?.length) {
    addSubheading(cursor, 'Procedural Interventions', C.primary);
    addBulletList(cursor, tx.procedural_interventions);
  }
  if (tx.supportive_care?.length) {
    addSubheading(cursor, 'Supportive Care', C.accent);
    addBulletList(cursor, tx.supportive_care, C.accent);
  }

  if (report.specialist_referrals?.length) {
    addSectionHeading(cursor, 'Specialist Referrals', 10);
    addBulletList(cursor, report.specialist_referrals, C.purple);
  }

  addSectionHeading(cursor, 'Follow-Up Plan', 11);
  if (fu.follow_up_intervals?.length) {
    addSubheading(cursor, 'Follow-up Intervals', C.primary);
    addBulletList(cursor, fu.follow_up_intervals);
  }
  if (fu.repeat_imaging?.length) {
    addSubheading(cursor, 'Repeat Imaging', C.accent);
    addBulletList(cursor, fu.repeat_imaging, C.accent);
  }
  if (fu.monitoring_parameters?.length) {
    addSubheading(cursor, 'Monitoring Parameters', C.green);
    addBulletList(cursor, fu.monitoring_parameters, C.green);
  }

  if (report.red_flags?.length) {
    addSectionHeading(cursor, 'Red Flag Findings', 12);
    addWarningBox(cursor, 'Urgent Escalation Required', report.red_flags);
  }

  if (report.clinical_reasoning) {
    addSectionHeading(cursor, 'Clinical Reasoning', 13);
    addInfoCard(cursor, report.clinical_reasoning);
  }

  if (report.references?.length) {
    addSectionHeading(cursor, 'Guideline References', 14);
    report.references.forEach(ref => {
      addHighlightBox(
        cursor,
        ref.organization,
        `${ref.title}${ref.relevance ? ` — ${ref.relevance}` : ''}`,
        { bg: C.cyanBg, border: C.cyanBorder, text: C.primary },
      );
    });
  }

  addDisclaimerBox(cursor, report.disclaimer);
}

export async function generateDetectionReportPdf(
  result: ClassificationResult,
  meta: DetectionReportMeta,
  gradcam: string | null,
  cdsReport: CDSReport | null,
): Promise<void> {
  const cursor = createReportDoc('Imaging Analysis Report');
  const predicted = result.predicted_class.replace(/_/g, ' ');
  const confidence = `${Math.round(result.confidence * 100)}%`;

  addSectionHeading(cursor, 'Scan Information', 1);
  addStatCards(cursor, [
    { label: 'Modality', value: meta.modalityLabel, color: C.accent },
    { label: 'Model', value: meta.architecture, color: C.purple },
    { label: 'Method', value: 'Grad-CAM', color: C.primary },
  ]);

  addSectionHeading(cursor, 'Primary Diagnosis', 2);
  addStatCards(cursor, [
    { label: 'Predicted Class', value: predicted.length > 18 ? `${predicted.slice(0, 16)}…` : predicted, color: C.primary },
    { label: 'Confidence', value: confidence, color: C.accent },
  ]);

  const sorted = Object.entries(result.all_scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    addSectionHeading(cursor, 'Class Probability Distribution', 3);
    sorted.forEach(([cls, score], i) => {
      addProgressBar(cursor, cls, score, i === 0);
    });
  }

  if (gradcam) {
    addSectionHeading(cursor, 'Grad-CAM Visualization', sorted.length ? 4 : 3);
    await addGradCamImage(
      cursor,
      gradcam,
      'Gradient-weighted Class Activation Map — warmer regions indicate areas that most influenced the AI prediction',
    );
  }

  if (cdsReport) {
    addCdsReport(cursor, cdsReport);
  } else {
    addDisclaimerBox(cursor, 'Clinical Decision Support report was not available at export time.');
  }

  addDisclaimerBox(cursor, 'For educational and research purposes only. Not intended for clinical use.');
  const doc = finalizeDoc(cursor);
  const date = new Date().toISOString().slice(0, 10);
  downloadPdf(doc, `medai-imaging-${slugifyFilename(meta.modalityId)}-${date}.pdf`);
}
