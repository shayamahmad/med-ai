import { DiseaseProfile, StructuredDiagnosis, SymptomCheckResult, UrgencyLevel } from '../../types/clinical';
import {
  C,
  PdfCursor,
  addBulletList,
  addColoredTags,
  addDisclaimerBox,
  addHighlightBox,
  addInfoCard,
  addParagraph,
  addRankBadge,
  addSectionHeading,
  addSubheading,
  createReportDoc,
  downloadPdf,
  finalizeDoc,
  urgencyStyle,
} from './pdfHelpers';

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  low: 'Low urgency',
  medium: 'Medium urgency',
  high: 'High urgency',
};

function addClinicalProfile(cursor: PdfCursor, profile: DiseaseProfile): void {
  addSubheading(cursor, 'Clinical Guide', C.purple);

  const severityStyle = profile.severity === 'critical' || profile.severity === 'severe'
    ? urgencyStyle('high')
    : profile.severity === 'moderate'
      ? urgencyStyle('medium')
      : urgencyStyle('low');
  addHighlightBox(cursor, 'Severity', profile.severity.toUpperCase(), severityStyle);
  addInfoCard(cursor, profile.overview);

  if (profile.underlying_cause) {
    addSubheading(cursor, 'Underlying Cause', C.primary);
    addParagraph(cursor, profile.underlying_cause);
  }
  if (profile.recovery_timeline) {
    addHighlightBox(cursor, 'Expected Recovery', profile.recovery_timeline, {
      bg: C.cyanBg,
      border: C.cyanBorder,
      text: C.primary,
    });
  }
  if (profile.first_line_treatment?.length) {
    addSubheading(cursor, 'First-line Approaches', C.green);
    addBulletList(cursor, profile.first_line_treatment, C.green);
  }
  if (profile.management_strategies?.length) {
    addSubheading(cursor, 'Management Strategies', C.primary);
    addBulletList(cursor, profile.management_strategies);
  }
  if (profile.supportive_care?.length) {
    addSubheading(cursor, 'Supportive Care', C.accent);
    addBulletList(cursor, profile.supportive_care, C.accent);
  }
  if (profile.home_care?.length) {
    addSubheading(cursor, 'Home Care Guidance', C.primary);
    addBulletList(cursor, profile.home_care);
  }
  if (profile.diagnostic_tests?.length) {
    addSubheading(cursor, 'Diagnostic Tests', C.purple);
    addBulletList(cursor, profile.diagnostic_tests, C.purple);
  }
  if (profile.medication_categories?.length) {
    addSubheading(cursor, 'Medication Categories (Educational)', C.amber);
    profile.medication_categories.forEach(med => {
      addHighlightBox(cursor, med.category, `${med.purpose}. ${med.note}`, {
        bg: C.purpleLight,
        border: C.purple,
        text: C.purple,
      });
    });
  }
  if (profile.warning_signs?.length) {
    addSubheading(cursor, 'Warning Signs', C.red);
    addBulletList(cursor, profile.warning_signs, C.red);
  }
  if (profile.prevention?.length) {
    addSubheading(cursor, 'Prevention', C.green);
    addBulletList(cursor, profile.prevention, C.green);
  }
}

function addDiagnosis(cursor: PdfCursor, diagnosis: StructuredDiagnosis, profile?: DiseaseProfile): void {
  addRankBadge(cursor, diagnosis.rank, diagnosis.name);

  const tags: { label: string; style: ReturnType<typeof urgencyStyle> }[] = [
    { label: URGENCY_LABEL[diagnosis.urgency] ?? diagnosis.urgency, style: urgencyStyle(diagnosis.urgency) },
  ];
  if (diagnosis.seek_care_now) {
    tags.push({ label: 'Seek care now', style: urgencyStyle('high') });
  }
  if (diagnosis.clinical_available) {
    tags.push({
      label: 'Clinical guide',
      style: { bg: C.cyanBg, border: C.cyanBorder, text: C.primary },
    });
  }
  addColoredTags(cursor, tags);

  if (diagnosis.match_reason) {
    addSubheading(cursor, 'Clinical Rationale', C.primary);
    addInfoCard(cursor, diagnosis.match_reason);
  }
  if (diagnosis.distinguishing_features) {
    addHighlightBox(cursor, 'Key Features', diagnosis.distinguishing_features, {
      bg: C.cyanBg,
      border: C.accent,
      text: C.primary,
    });
  }
  if (diagnosis.urgency_guidance) {
    addHighlightBox(cursor, 'Urgency Guidance', diagnosis.urgency_guidance, urgencyStyle(diagnosis.urgency));
  }

  if (profile) {
    addClinicalProfile(cursor, profile);
  } else if (diagnosis.clinical_available) {
    addParagraph(cursor, 'Clinical guide could not be fetched. Card data above is still included in this report.');
  }

  cursor.y += 4;
}

export function generateSymptomReportPdf(
  result: SymptomCheckResult,
  profiles: Record<string, DiseaseProfile>,
): void {
  const cursor = createReportDoc('Symptom Analysis Report');
  const symptomsText = result.input_symptoms?.length
    ? result.input_symptoms.join(', ')
    : 'Not specified';

  addSectionHeading(cursor, 'Patient Input', 1);
  addInfoCard(cursor, symptomsText);

  if (result.summary) {
    addSectionHeading(cursor, 'Case Summary', 2);
    addHighlightBox(cursor, 'Assessment Overview', result.summary, {
      bg: C.purpleLight,
      border: C.purple,
      text: C.purple,
    });
  }

  const diagnoses = result.diagnoses?.length ? result.diagnoses : [];
  if (diagnoses.length) {
    addSectionHeading(cursor, `Differential Diagnosis — ${diagnoses.length} Conditions`, 3);
    diagnoses.forEach(d => addDiagnosis(cursor, d, profiles[d.slug]));
  } else if (result.answer) {
    addSectionHeading(cursor, 'Analysis', 3);
    addParagraph(cursor, result.answer);
  }

  if (result.sources?.length) {
    addSectionHeading(cursor, 'Evidence Sources', 4);
    addBulletList(cursor, result.sources, C.purple);
  }

  addDisclaimerBox(cursor, result.disclaimer);
  const doc = finalizeDoc(cursor);
  const date = new Date().toISOString().slice(0, 10);
  downloadPdf(doc, `medai-symptom-report-${date}.pdf`);
}
