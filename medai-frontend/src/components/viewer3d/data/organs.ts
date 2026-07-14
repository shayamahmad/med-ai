import { DiseaseEntry, OrganData, SubStructure } from '../types/anatomy.types';

const PLACEHOLDER_RE = /your-username|placeholder|example/i;

export function models3dBase(): string {
  if (process.env.REACT_APP_3D_MODELS_BASE) {
    return process.env.REACT_APP_3D_MODELS_BASE.replace(/\/$/, '');
  }
  const repo = process.env.REACT_APP_HF_ASSETS_REPO?.trim();
  if (repo && !PLACEHOLDER_RE.test(repo)) {
    const kind = process.env.REACT_APP_HF_REPO_TYPE || 'dataset';
    return kind === 'dataset'
      ? `https://huggingface.co/datasets/${repo}/resolve/main/3d-models`
      : `https://huggingface.co/${repo}/resolve/main/3d-models`;
  }
  const api = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  return `${api}/api/3d-models`;
}

export const MODELS_3D_BASE = models3dBase();

const HEART_DISEASES: DiseaseEntry[] = [
  {
    name: 'Heart Attack (MI)',
    symptoms: ['Chest pain', 'Shortness of breath', 'Left arm pain', 'Nausea', 'Sweating'],
    riskFactors: ['Hypertension', 'High cholesterol', 'Smoking', 'Diabetes', 'Obesity'],
    treatments: ['Aspirin', 'PCI/stenting', 'CABG surgery', 'Thrombolytics', 'Beta-blockers'],
    materialColorOverride: '#cc0000',
  },
  {
    name: 'Coronary Artery Disease',
    symptoms: ['Angina', 'Fatigue', 'Exertional chest pressure'],
    riskFactors: ['Age > 45', 'Family history', 'Sedentary lifestyle'],
    treatments: ['Statins', 'Nitrates', 'Lifestyle modification', 'Angioplasty'],
    materialColorOverride: '#ff4400',
  },
];

const HEART_SUBS: SubStructure[] = [
  { id: 'left_atrium', label: 'Left Atrium', description: 'Receives oxygenated blood from pulmonary veins.' },
  { id: 'right_atrium', label: 'Right Atrium', description: 'Receives deoxygenated blood from vena cava.' },
  { id: 'left_ventricle', label: 'Left Ventricle', description: 'Pumps oxygenated blood into aorta at high pressure.' },
  { id: 'right_ventricle', label: 'Right Ventricle', description: 'Pumps deoxygenated blood into pulmonary artery.' },
  { id: 'mitral_valve', label: 'Mitral Valve', description: 'Bicuspid valve between left atrium and left ventricle.' },
  { id: 'tricuspid_valve', label: 'Tricuspid Valve', description: 'Three-leaflet valve between right atrium and right ventricle.' },
  { id: 'aorta', label: 'Aorta', description: 'Largest artery, carries oxygenated blood from left ventricle.' },
  { id: 'pulmonary_artery', label: 'Pulmonary Artery', description: 'Carries deoxygenated blood from right ventricle to lungs.' },
  { id: 'pulmonary_veins', label: 'Pulmonary Veins', description: 'Four veins returning oxygenated blood from lungs to left atrium.' },
];

const LUNG_DISEASES: DiseaseEntry[] = [
  {
    name: 'Pneumonia',
    symptoms: ['Cough', 'Fever', 'Chest pain', 'Dyspnea', 'Sputum production'],
    riskFactors: ['Smoking', 'Immunocompromise', 'Chronic lung disease', 'Age extremes'],
    treatments: ['Antibiotics', 'Oxygen therapy', 'Fluids', 'Chest physiotherapy'],
    materialColorOverride: '#88aaff',
  },
  {
    name: 'COPD',
    symptoms: ['Chronic cough', 'Dyspnea', 'Wheezing', 'Sputum', 'Fatigue'],
    riskFactors: ['Smoking', 'Occupational dust', 'Alpha-1 antitrypsin deficiency'],
    treatments: ['Bronchodilators', 'Inhaled corticosteroids', 'Pulmonary rehab', 'Smoking cessation'],
    materialColorOverride: '#aaaaaa',
  },
  {
    name: 'Lung Cancer',
    symptoms: ['Persistent cough', 'Hemoptysis', 'Weight loss', 'Chest pain', 'Dyspnea'],
    riskFactors: ['Smoking', 'Radon exposure', 'Asbestos', 'Family history'],
    treatments: ['Surgery', 'Chemotherapy', 'Radiation', 'Immunotherapy', 'Targeted therapy'],
    materialColorOverride: '#663300',
  },
];

const LUNG_SUBS: SubStructure[] = [
  { id: 'left_lobe', label: 'Left Lobe', description: 'Two-lobed left lung with cardiac notch.' },
  { id: 'right_lobe', label: 'Right Lobe', description: 'Three-lobed right lung, larger volume.' },
  { id: 'bronchi', label: 'Bronchi', description: 'Airway branches distributing air to lung segments.' },
  { id: 'trachea', label: 'Trachea', description: 'Windpipe connecting larynx to main bronchi.' },
  { id: 'alveoli', label: 'Alveoli', description: 'Microscopic air sacs where gas exchange occurs.' },
];

const BRAIN_SUBS: SubStructure[] = [
  { id: 'cerebrum', label: 'Cerebrum', description: 'Largest brain region; cognition, motor, sensory processing.' },
  { id: 'cerebellum', label: 'Cerebellum', description: 'Coordinates balance, posture, and fine motor control.' },
  { id: 'brainstem', label: 'Brainstem', description: 'Controls vital autonomic functions: breathing, heart rate.' },
  { id: 'frontal_lobe', label: 'Frontal Lobe', description: 'Executive function, planning, voluntary movement.' },
  { id: 'temporal_lobe', label: 'Temporal Lobe', description: 'Auditory processing, memory, language comprehension.' },
  { id: 'parietal_lobe', label: 'Parietal Lobe', description: 'Somatosensory integration and spatial awareness.' },
  { id: 'occipital_lobe', label: 'Occipital Lobe', description: 'Primary visual cortex and visual processing.' },
  { id: 'hypothalamus', label: 'Hypothalamus', description: 'Regulates temperature, hunger, circadian rhythms.' },
  { id: 'pituitary_gland', label: 'Pituitary Gland', description: 'Master endocrine gland controlling hormone release.' },
];

const BRAIN_DISEASES: DiseaseEntry[] = [
  {
    name: 'Stroke',
    symptoms: ['Sudden weakness', 'Facial droop', 'Speech difficulty', 'Vision loss', 'Severe headache'],
    riskFactors: ['Hypertension', 'Atrial fibrillation', 'Diabetes', 'Smoking'],
    treatments: ['Thrombolysis', 'Thrombectomy', 'Antiplatelets', 'Rehabilitation'],
    materialColorOverride: '#ff6600',
  },
  {
    name: 'Brain Tumor',
    symptoms: ['Headache', 'Seizures', 'Personality change', 'Focal deficits', 'Nausea'],
    riskFactors: ['Radiation exposure', 'Genetic syndromes', 'Family history'],
    treatments: ['Surgery', 'Radiation', 'Chemotherapy', 'Targeted therapy'],
    materialColorOverride: '#aa00aa',
  },
  {
    name: "Alzheimer's Disease",
    symptoms: ['Memory loss', 'Confusion', 'Language difficulty', 'Wandering', 'Mood changes'],
    riskFactors: ['Age', 'APOE4 genotype', 'Family history', 'Cardiovascular disease'],
    treatments: ['Cholinesterase inhibitors', 'Memantine', 'Cognitive therapy', 'Supportive care'],
    materialColorOverride: '#888800',
  },
];

const KIDNEY_SUBS: SubStructure[] = [
  { id: 'cortex', label: 'Cortex', description: 'Outer renal tissue containing glomeruli and convoluted tubules.' },
  { id: 'medulla', label: 'Medulla', description: 'Inner pyramids responsible for urine concentration.' },
  { id: 'renal_pelvis', label: 'Renal Pelvis', description: 'Funnel collecting urine from calyces.' },
  { id: 'ureter', label: 'Ureter', description: 'Muscular tube transporting urine to bladder.' },
];

const LIVER_SUBS: SubStructure[] = [
  { id: 'right_lobe', label: 'Right Lobe', description: 'Largest hepatic lobe, segments V–VIII.' },
  { id: 'left_lobe', label: 'Left Lobe', description: 'Smaller lobe, segments II–IV.' },
  { id: 'caudate_lobe', label: 'Caudate Lobe', description: 'Posterior lobe adjacent to IVC.' },
  { id: 'quadrate_lobe', label: 'Quadrate Lobe', description: 'Anterior lobe between gallbladder and falciform ligament.' },
  { id: 'gallbladder', label: 'Gallbladder', description: 'Stores and concentrates bile for fat digestion.' },
];

function organ(
  partial: Omit<OrganData, 'diseases' | 'subStructures' | 'explodeOffset' | 'restPosition' | 'cameraTarget' | 'layerGroup'> & {
    diseases?: DiseaseEntry[];
    subStructures?: SubStructure[];
    explodeOffset?: [number, number, number];
    restPosition?: [number, number, number];
    cameraTarget?: [number, number, number];
    layerGroup?: OrganData['layerGroup'];
  },
): OrganData {
  return {
    diseases: [],
    subStructures: [],
    explodeOffset: [0, 0, 0],
    restPosition: [0, 0, 0],
    cameraTarget: [0, 0.5, 2.0],
    layerGroup: 'organ',
    ...partial,
  };
}

export const ORGANS: OrganData[] = [
  organ({
    id: 'heart_four_chambers',
    label: 'Heart (4 Chambers)',
    file: `${MODELS_3D_BASE}/heart_four_chambers.glb`,
    color: '#ff4466',
    system: 'Cardiovascular',
    shortInfo: 'Four-chamber muscular pump. ~300g. Beats ~70 bpm at rest.',
    location: 'Mediastinum, between the lungs, slightly left of center',
    physiologicalFunction: 'Pumps oxygenated blood to the body via systemic circulation and deoxygenated blood to the lungs via pulmonary circulation. Generates ~5L/min cardiac output at rest.',
    diseases: HEART_DISEASES,
    subStructures: HEART_SUBS,
    explodeOffset: [0, 1.2, 2.2],
    restPosition: [0, 0.2, 0],
    cameraTarget: [0, 0.5, 2.0],
    imagingSliceRange: { ct: [33, 52], mri: [30, 48] },
  }),
  organ({
    id: 'realistic_human_heart',
    label: 'Heart (Realistic)',
    file: `${MODELS_3D_BASE}/realistic_human_heart.glb`,
    color: '#ff2255',
    system: 'Cardiovascular',
    shortInfo: 'High-fidelity anatomical model showing external cardiac anatomy, coronary vessels, and major great vessels.',
    location: 'Mediastinum, anterior to vertebral column',
    physiologicalFunction: 'Muscular pump maintaining systemic and pulmonary circulations through coordinated atrial and ventricular contraction.',
    diseases: HEART_DISEASES,
    subStructures: HEART_SUBS,
    explodeOffset: [0, 1.2, 2.2],
    restPosition: [0.15, 0.2, 0],
    cameraTarget: [0.15, 0.5, 2.0],
    imagingSliceRange: { ct: [33, 52], mri: [30, 48] },
  }),
  organ({
    id: 'human_heart_and_lungs',
    label: 'Heart & Lungs (En Bloc)',
    file: `${MODELS_3D_BASE}/human_heart_and_lungs_enbloc.glb`,
    color: '#ff6644',
    system: 'Cardiorespiratory',
    shortInfo: 'Heart and lungs as a single en-bloc specimen, showing mediastinal relationships and hilum structures.',
    location: 'Thoracic cavity, mediastinum and bilateral pleural spaces',
    physiologicalFunction: 'Combined cardiorespiratory unit demonstrating gas exchange and cardiac output relationships.',
    diseases: [...HEART_DISEASES, ...LUNG_DISEASES],
    subStructures: [...HEART_SUBS, ...LUNG_SUBS],
    explodeOffset: [0, 1.0, 1.8],
    restPosition: [0, 0.3, 0],
    cameraTarget: [0, 0.4, 2.5],
    imagingSliceRange: { ct: [33, 60], mri: [30, 55] },
  }),
  organ({
    id: 'human_heart_cardiac_bypass',
    label: 'Heart (Cardiac Bypass)',
    file: `${MODELS_3D_BASE}/human_heart_cardiac_bypass.glb`,
    color: '#ff3355',
    system: 'Cardiovascular',
    shortInfo: 'Model demonstrating coronary artery bypass graft (CABG) surgery. Shows saphenous vein or arterial graft routing.',
    location: 'Mediastinum with exposed epicardial surface',
    physiologicalFunction: 'Surgical revascularization model illustrating bypass grafts restoring myocardial perfusion.',
    diseases: HEART_DISEASES,
    subStructures: HEART_SUBS,
    explodeOffset: [0, 1.2, 2.2],
    restPosition: [-0.1, 0.2, 0.1],
    cameraTarget: [-0.1, 0.5, 2.0],
    imagingSliceRange: { ct: [33, 52], mri: [30, 48] },
  }),
  organ({
    id: 'left_lung',
    label: 'Left Lung',
    file: `${MODELS_3D_BASE}/left_lung.glb`,
    color: '#44aaff',
    system: 'Respiratory',
    shortInfo: 'Two-lobed left lung. Cardiac notch accommodates heart. Gas exchange surface ~35m².',
    location: 'Left hemithorax, separated from right lung by mediastinum',
    physiologicalFunction: 'Facilitates oxygen uptake and CO₂ elimination via alveolar-capillary interface.',
    diseases: LUNG_DISEASES,
    subStructures: LUNG_SUBS,
    explodeOffset: [-1.8, 0.8, 1.5],
    restPosition: [-0.55, 0.25, 0],
    cameraTarget: [-0.55, 0.4, 2.0],
    imagingSliceRange: { ct: [40, 58], mri: [38, 55] },
  }),
  organ({
    id: 'brain_left_hemisphere',
    label: 'Brain — Left Hemisphere',
    file: `${MODELS_3D_BASE}/brain_left_hemisphere.glb`,
    color: '#ffaa44',
    system: 'Nervous',
    shortInfo: "Left cerebral hemisphere. Contains Broca's area (speech production) and primary motor cortex controlling right body side.",
    location: 'Left cranial vault, supratentorial compartment',
    physiologicalFunction: 'Processes language, analytical reasoning, and motor control for the contralateral body.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [-0.2, 1.1, 0],
    cameraTarget: [-0.2, 1.2, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'brain_right_hemisphere',
    label: 'Brain — Right Hemisphere',
    file: `${MODELS_3D_BASE}/brain_right_hemisphere.glb`,
    color: '#ffbb55',
    system: 'Nervous',
    shortInfo: 'Right cerebral hemisphere. Dominant for spatial reasoning, face recognition, and artistic/musical processing.',
    location: 'Right cranial vault, supratentorial compartment',
    physiologicalFunction: 'Spatial processing, prosody, face recognition, and holistic pattern perception.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0.2, 1.1, 0],
    cameraTarget: [0.2, 1.2, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'brain_coronal',
    label: 'Brain — Coronal Sections',
    file: `${MODELS_3D_BASE}/brain_coronal_cross_sections.glb`,
    color: '#ffcc66',
    system: 'Nervous',
    shortInfo: 'Coronal cross-sections revealing internal structures: basal ganglia, thalamus, corpus callosum, and limbic system.',
    location: 'Intracranial, coronal plane sections',
    physiologicalFunction: 'Demonstrates deep gray matter nuclei and white matter tracts in sectional anatomy.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0, 1.15, 0.1],
    cameraTarget: [0, 1.2, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'ventricles_of_the_brain',
    label: 'Brain Ventricles',
    file: `${MODELS_3D_BASE}/ventricles_of_the_brain.glb`,
    color: '#cc88ff',
    system: 'Nervous',
    shortInfo: 'CSF-filled cavities: lateral ventricles, third ventricle, cerebral aqueduct, and fourth ventricle.',
    location: 'Deep within cerebral hemispheres and brainstem',
    physiologicalFunction: 'Produces and circulates cerebrospinal fluid (~500 mL/day) cushioning the CNS.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0, 1.05, 0],
    cameraTarget: [0, 1.1, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'venous_brain_blood',
    label: 'Brain Venous System',
    file: `${MODELS_3D_BASE}/venous_brain_blood_model.glb`,
    color: '#aa55ee',
    system: 'Nervous',
    shortInfo: 'Cerebral venous drainage system including dural venous sinuses, cortical veins, and deep cerebral veins.',
    location: 'Superficial and deep cerebral venous networks',
    physiologicalFunction: 'Drains deoxygenated blood from brain parenchyma to internal jugular veins.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0.1, 1.1, -0.1],
    cameraTarget: [0.1, 1.2, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'human_brain_visual_pathway',
    label: 'Visual Pathway',
    file: `${MODELS_3D_BASE}/human_brain_visual_pathway.glb`,
    color: '#55ddff',
    system: 'Nervous',
    shortInfo: 'Optic nerves, chiasm, optic tracts, lateral geniculate nuclei, optic radiations through to primary visual cortex (V1).',
    location: 'Anterior cranial fossa to occipital lobe',
    physiologicalFunction: 'Transmits and processes visual information from retina to visual cortex.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [-0.1, 1.0, 0.15],
    cameraTarget: [-0.1, 1.1, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'ischemic_stroke',
    label: 'Ischemic Stroke Model',
    file: `${MODELS_3D_BASE}/ischemic_stroke_model.glb`,
    color: '#ff6622',
    system: 'Nervous',
    shortInfo: 'Visualizes ischemic territory following middle cerebral artery (MCA) occlusion.',
    location: 'MCA territory, lateral cerebral hemisphere',
    physiologicalFunction: 'Demonstrates infarct core and penumbra in acute ischemic stroke.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0.25, 1.05, 0],
    cameraTarget: [0.25, 1.15, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'multiple_sclerosis',
    label: 'Multiple Sclerosis',
    file: `${MODELS_3D_BASE}/multiple_sclerosis_ventricles.glb`,
    color: '#ee8833',
    system: 'Nervous',
    shortInfo: "Periventricular MS plaques (Dawson's fingers) and demyelination patterns.",
    location: 'Periventricular white matter, corpus callosum',
    physiologicalFunction: 'Models autoimmune demyelination disrupting CNS signal conduction.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [-0.15, 1.05, 0.05],
    cameraTarget: [-0.15, 1.15, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'mozg_i_oczy',
    label: 'Brain & Eyes',
    file: `${MODELS_3D_BASE}/mozg_i_oczy.glb`,
    color: '#33ccaa',
    system: 'Nervous',
    shortInfo: 'Brain with orbital contents intact, showing optic nerves entering the optic canal.',
    location: 'Cranial cavity with bilateral orbits',
    physiologicalFunction: 'Integrates visual sensory input with central neural processing.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0, 1.0, 0.2],
    cameraTarget: [0, 1.1, 2.0],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'fragment_mozgu',
    label: 'Brain Fragment',
    file: `${MODELS_3D_BASE}/fragment_mozgu.glb`,
    color: '#ffaa77',
    system: 'Nervous',
    shortInfo: 'Detailed cerebral tissue fragment showing gyri, sulci, and surface vasculature.',
    location: 'Cerebral cortical surface',
    physiologicalFunction: 'High-resolution cortical anatomy for surface vessel and gyrification study.',
    diseases: BRAIN_DISEASES,
    subStructures: BRAIN_SUBS,
    explodeOffset: [0, 2.8, 0.5],
    restPosition: [0.3, 1.1, -0.1],
    cameraTarget: [0.3, 1.2, 1.8],
    imagingSliceRange: { ct: [0, 25], mri: [0, 22] },
  }),
  organ({
    id: 'kidney',
    label: 'Kidney',
    file: `${MODELS_3D_BASE}/kidney.glb`,
    color: '#884422',
    system: 'Urinary',
    shortInfo: 'Bean-shaped retroperitoneal organ. ~150g. Filters ~180L plasma/day.',
    location: 'Retroperitoneum, T12–L3 vertebral level, right slightly inferior',
    physiologicalFunction: 'Filters blood, regulates electrolytes, acid-base balance, and fluid homeostasis.',
    diseases: [
      {
        name: 'Chronic Kidney Disease',
        symptoms: ['Fatigue', 'Edema', 'Nausea', 'Decreased urine output'],
        riskFactors: ['Diabetes', 'Hypertension', 'NSAID overuse'],
        treatments: ['ACE inhibitors', 'Dialysis', 'Transplant', 'Dietary modification'],
        materialColorOverride: '#664422',
      },
    ],
    subStructures: KIDNEY_SUBS,
    explodeOffset: [2.2, -0.8, 0.8],
    restPosition: [0.45, -0.35, -0.15],
    cameraTarget: [0.45, -0.2, 1.8],
    imagingSliceRange: { ct: [73, 82], mri: [70, 80] },
  }),
  organ({
    id: 'liver',
    label: 'Liver',
    file: `${MODELS_3D_BASE}/liver.glb`,
    color: '#aa5533',
    system: 'Digestive',
    shortInfo: 'Largest solid organ ~1.5kg. 8 Couinaud segments. Over 500 metabolic functions.',
    location: 'Right upper quadrant, beneath diaphragm',
    physiologicalFunction: 'Metabolism, detoxification, bile synthesis, glycogen storage, protein synthesis.',
    diseases: [
      {
        name: 'Hepatitis',
        symptoms: ['Jaundice', 'Fatigue', 'Abdominal pain', 'Nausea'],
        riskFactors: ['Viral infection', 'Alcohol', 'Autoimmune disease'],
        treatments: ['Antivirals', 'Immunosuppressants', 'Lifestyle changes'],
        materialColorOverride: '#ccaa00',
      },
    ],
    subStructures: LIVER_SUBS,
    explodeOffset: [1.6, -0.6, 1.8],
    restPosition: [0.55, -0.15, 0.1],
    cameraTarget: [0.55, 0, 2.0],
    imagingSliceRange: { ct: [61, 72], mri: [58, 70] },
  }),
  organ({
    id: 'realistic_human_stomach',
    label: 'Stomach',
    file: `${MODELS_3D_BASE}/realistic_human_stomach.glb`,
    color: '#cc8844',
    system: 'Digestive',
    shortInfo: 'J-shaped muscular organ. Holds ~1L. Produces HCl (pH ~2) for protein digestion.',
    location: 'Left upper abdomen, between esophagus and duodenum',
    physiologicalFunction: 'Mechanical and chemical digestion via acid and pepsin; intrinsic factor secretion.',
    diseases: [
      {
        name: 'Gastritis',
        symptoms: ['Epigastric pain', 'Nausea', 'Bloating', 'Indigestion'],
        riskFactors: ['H. pylori', 'NSAIDs', 'Alcohol', 'Stress'],
        treatments: ['PPIs', 'Antibiotics', 'Diet modification'],
        materialColorOverride: '#aa6644',
      },
    ],
    subStructures: [],
    explodeOffset: [-0.5, -0.4, 2.0],
    restPosition: [-0.2, -0.2, 0.15],
    cameraTarget: [-0.2, -0.05, 2.0],
    imagingSliceRange: { ct: [70, 78], mri: [68, 76] },
  }),
  organ({
    id: 'larynx',
    label: 'Larynx',
    file: `${MODELS_3D_BASE}/larynx.glb`,
    color: '#99ccbb',
    system: 'Respiratory',
    shortInfo: 'Voice box formed by thyroid, cricoid, and arytenoid cartilages. Vocal folds vibrate at 100–300 Hz.',
    location: 'Anterior neck, C3–C6 vertebral level',
    physiologicalFunction: 'Airway protection during swallowing and phonation via vocal fold vibration.',
    diseases: LUNG_DISEASES.slice(0, 2),
    subStructures: LUNG_SUBS.slice(2, 4),
    explodeOffset: [0, 2.0, 2.5],
    restPosition: [0, 0.85, 0.2],
    cameraTarget: [0, 0.95, 1.8],
    imagingSliceRange: { ct: [26, 32], mri: [24, 30] },
  }),
  organ({
    id: 'muscle',
    label: 'Muscle Tissue',
    file: `${MODELS_3D_BASE}/muscle.glb`,
    color: '#dd4444',
    system: 'Muscular',
    shortInfo: 'Skeletal muscle microstructure: fascicles, muscle fibres, myofibrils, and sarcomere organization.',
    location: 'Distributed throughout musculoskeletal system',
    physiologicalFunction: 'Force generation via actin-myosin cross-bridge cycling in sarcomeres.',
    diseases: [
      {
        name: 'Muscular Dystrophy',
        symptoms: ['Progressive weakness', 'Muscle wasting', 'Contractures'],
        riskFactors: ['Genetic mutations', 'Family history'],
        treatments: ['Physical therapy', 'Corticosteroids', 'Gene therapy trials'],
        materialColorOverride: '#994444',
      },
    ],
    subStructures: [],
    explodeOffset: [2.5, 0, 1.0],
    restPosition: [0.7, 0, 0.3],
    cameraTarget: [0.7, 0.2, 2.0],
  }),
  organ({
    id: 'rigged_mouth',
    label: 'Mouth & Oral Cavity',
    file: `${MODELS_3D_BASE}/rigged_mouth.glb`,
    color: '#ff8866',
    system: 'Digestive',
    shortInfo: 'Oral cavity with tongue, teeth, and soft palate. Articulated rig shows jaw mechanics.',
    location: 'Oral vestibule, inferior to nasal cavity',
    physiologicalFunction: 'Mastication, speech articulation, and initiation of digestion via salivary enzymes.',
    diseases: [],
    subStructures: [],
    explodeOffset: [0, 1.5, 2.8],
    restPosition: [0, 0.7, 0.35],
    cameraTarget: [0, 0.8, 1.6],
    imagingSliceRange: { ct: [20, 28], mri: [18, 26] },
  }),
  organ({
    id: 'uterus',
    label: 'Uterus',
    file: `${MODELS_3D_BASE}/uterus.glb`,
    color: '#ff7799',
    system: 'Reproductive',
    shortInfo: 'Pear-shaped muscular organ. ~60g (non-pregnant). Endometrium cycles monthly.',
    location: 'Pelvis, between bladder and rectum',
    physiologicalFunction: 'Supports embryo implantation, fetal development, and menstruation.',
    diseases: [
      {
        name: 'Endometriosis',
        symptoms: ['Pelvic pain', 'Dysmenorrhea', 'Infertility'],
        riskFactors: ['Family history', 'Early menarche', 'Nulliparity'],
        treatments: ['NSAIDs', 'Hormonal therapy', 'Laparoscopic surgery'],
        materialColorOverride: '#cc4477',
      },
    ],
    subStructures: [],
    explodeOffset: [0, -2.2, 1.5],
    restPosition: [0, -0.55, 0.1],
    cameraTarget: [0, -0.4, 1.8],
    imagingSliceRange: { ct: [83, 92], mri: [80, 90] },
  }),
  organ({
    id: 'male_reproductive',
    label: 'Male Reproductive System',
    file: `${MODELS_3D_BASE}/male_reproductive_system.glb`,
    color: '#5599cc',
    system: 'Reproductive',
    shortInfo: 'Testes, epididymis, vas deferens, seminal vesicles, prostate, and urethra.',
    location: 'Pelvis and perineum',
    physiologicalFunction: 'Spermatogenesis, hormone production, and delivery of gametes.',
    diseases: [
      {
        name: 'Benign Prostatic Hyperplasia',
        symptoms: ['Urinary frequency', 'Weak stream', 'Nocturia'],
        riskFactors: ['Age', 'Family history'],
        treatments: ['Alpha-blockers', '5-alpha reductase inhibitors', 'Surgery'],
        materialColorOverride: '#336699',
      },
    ],
    subStructures: [],
    explodeOffset: [0, -2.5, 1.2],
    restPosition: [0, -0.6, 0.05],
    cameraTarget: [0, -0.45, 1.8],
    imagingSliceRange: { ct: [88, 100], mri: [85, 98] },
  }),
];

export const ANATOMY_SYSTEMS: string[] = [
  'All Systems',
  ...Array.from(new Set(ORGANS.map(o => o.system))),
];

export function getOrganById(id: string): OrganData | undefined {
  return ORGANS.find(o => o.id === id);
}

export function getSearchOptions(): { id: string; label: string; type: 'organ' | 'sub' }[] {
  const options: { id: string; label: string; type: 'organ' | 'sub' }[] = [];
  ORGANS.forEach(o => {
    options.push({ id: o.id, label: o.label, type: 'organ' });
    o.subStructures.forEach(s => {
      options.push({ id: o.id, label: s.label, type: 'sub' });
    });
  });
  return options;
}
