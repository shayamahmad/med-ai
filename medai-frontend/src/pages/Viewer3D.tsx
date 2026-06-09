import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


const TEXT   = '#d0e4f0';
const DIM    = 'rgba(180,220,240,0.75)';
const DIMMER = 'rgba(140,180,210,0.5)';

const PLACEHOLDER_RE = /your-username|placeholder|example/i;

/** Backend proxy (default), Hugging Face dataset, custom CDN, or public S3 bucket. */
function models3dBase(): string {
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

const MODELS_3D_BASE = models3dBase();

// ─── All 23 models mapped to your actual filenames ───────────────────────────
const ORGANS = [
  {
    id: 'heart_four_chambers',
    label: 'Heart (4 Chambers)',
    file: `${MODELS_3D_BASE}/heart_four_chambers.glb`,
    color: '#ff4466',
    system: 'Cardiovascular',
    info: 'Four-chamber muscular pump. ~300g. Beats ~70 bpm at rest. Drives ~5L/min cardiac output.',
  },
  {
    id: 'realistic_human_heart',
    label: 'Heart (Realistic)',
    file: `${MODELS_3D_BASE}/realistic_human_heart.glb`,
    color: '#ff2255',
    system: 'Cardiovascular',
    info: 'High-fidelity anatomical model showing external cardiac anatomy, coronary vessels, and major great vessels.',
  },
  {
    id: 'human_heart_and_lungs',
    label: 'Heart & Lungs (En Bloc)',
    file: `${MODELS_3D_BASE}/human_heart_and_lungs_enbloc.glb`,
    color: '#ff6644',
    system: 'Cardiorespiratory',
    info: 'Heart and lungs as a single en-bloc specimen, showing mediastinal relationships and hilum structures.',
  },
  {
    id: 'human_heart_cardiac_bypass',
    label: 'Heart (Cardiac Bypass)',
    file: `${MODELS_3D_BASE}/human_heart_cardiac_bypass.glb`,
    color: '#ff3355',
    system: 'Cardiovascular',
    info: 'Model demonstrating coronary artery bypass graft (CABG) surgery. Shows saphenous vein or arterial graft routing.',
  },
  {
    id: 'left_lung',
    label: 'Left Lung',
    file: `${MODELS_3D_BASE}/left_lung.glb`,
    color: '#44aaff',
    system: 'Respiratory',
    info: 'Two-lobed left lung. Cardiac notch accommodates heart. Gas exchange surface ~35m². Tidal volume ~250mL.',
  },
  {
    id: 'brain_left_hemisphere',
    label: 'Brain — Left Hemisphere',
    file: `${MODELS_3D_BASE}/brain_left_hemisphere.glb`,
    color: '#ffaa44',
    system: 'Nervous',
    info: 'Left cerebral hemisphere. Contains Broca\'s area (speech production) and primary motor cortex controlling right body side.',
  },
  {
    id: 'brain_right_hemisphere',
    label: 'Brain — Right Hemisphere',
    file: `${MODELS_3D_BASE}/brain_right_hemisphere.glb`,
    color: '#ffbb55',
    system: 'Nervous',
    info: 'Right cerebral hemisphere. Dominant for spatial reasoning, face recognition, and artistic/musical processing.',
  },
  {
    id: 'brain_coronal',
    label: 'Brain — Coronal Sections',
    file: `${MODELS_3D_BASE}/brain_coronal_cross_sections.glb`,
    color: '#ffcc66',
    system: 'Nervous',
    info: 'Coronal (frontal) cross-sections revealing internal structures: basal ganglia, thalamus, corpus callosum, and limbic system.',
  },
  {
    id: 'ventricles_of_the_brain',
    label: 'Brain Ventricles',
    file: `${MODELS_3D_BASE}/ventricles_of_the_brain.glb`,
    color: '#cc88ff',
    system: 'Nervous',
    info: 'CSF-filled cavities: lateral ventricles, third ventricle, cerebral aqueduct, and fourth ventricle. Produces ~500mL CSF/day.',
  },
  {
    id: 'venous_brain_blood',
    label: 'Brain Venous System',
    file: `${MODELS_3D_BASE}/venous_brain_blood_model.glb`,
    color: '#aa55ee',
    system: 'Nervous',
    info: 'Cerebral venous drainage system including dural venous sinuses, cortical veins, and deep cerebral veins.',
  },
  {
    id: 'human_brain_visual_pathway',
    label: 'Visual Pathway',
    file: `${MODELS_3D_BASE}/human_brain_visual_pathway.glb`,
    color: '#55ddff',
    system: 'Nervous',
    info: 'Optic nerves, chiasm, optic tracts, lateral geniculate nuclei, optic radiations through to primary visual cortex (V1).',
  },
  {
    id: 'ischemic_stroke',
    label: 'Ischemic Stroke Model',
    file: `${MODELS_3D_BASE}/ischemic_stroke_model.glb`,
    color: '#ff6622',
    system: 'Nervous',
    info: 'Visualizes ischemic territory following middle cerebral artery (MCA) occlusion. Shows penumbra and infarct core.',
  },
  {
    id: 'multiple_sclerosis',
    label: 'Multiple Sclerosis',
    file: `${MODELS_3D_BASE}/multiple_sclerosis_ventricles.glb`,
    color: '#ee8833',
    system: 'Nervous',
    info: 'Periventricular MS plaques (Dawson\'s fingers) and demyelination patterns visible on ventricular surface anatomy.',
  },
  {
    id: 'mozg_i_oczy',
    label: 'Brain & Eyes',
    file: `${MODELS_3D_BASE}/mozg_i_oczy.glb`,
    color: '#33ccaa',
    system: 'Nervous',
    info: 'Brain with orbital contents intact, showing optic nerves entering the optic canal and their relationship to the chiasm.',
  },
  {
    id: 'fragment_mozgu',
    label: 'Brain Fragment',
    file: `${MODELS_3D_BASE}/fragment_mozgu.glb`,
    color: '#ffaa77',
    system: 'Nervous',
    info: 'Detailed cerebral tissue fragment showing gyri, sulci, and surface vasculature in high anatomical detail.',
  },
  {
    id: 'kidney',
    label: 'Kidney',
    file: `${MODELS_3D_BASE}/kidney.glb`,
    color: '#884422',
    system: 'Urinary',
    info: 'Bean-shaped retroperitoneal organ. ~150g. Filters ~180L plasma/day. Regulates pH, electrolytes and fluid balance.',
  },
  {
    id: 'liver',
    label: 'Liver',
    file: `${MODELS_3D_BASE}/liver.glb`,
    color: '#aa5533',
    system: 'Digestive',
    info: 'Largest solid organ ~1.5kg. 8 Couinaud segments. Over 500 metabolic functions including detoxification and bile synthesis.',
  },
  {
    id: 'realistic_human_stomach',
    label: 'Stomach',
    file: `${MODELS_3D_BASE}/realistic_human_stomach.glb`,
    color: '#cc8844',
    system: 'Digestive',
    info: 'J-shaped muscular organ. Holds ~1L. Produces HCl (pH ~2) for protein digestion and intrinsic factor for B12 absorption.',
  },
  {
    id: 'larynx',
    label: 'Larynx',
    file: `${MODELS_3D_BASE}/larynx.glb`,
    color: '#99ccbb',
    system: 'Respiratory',
    info: 'Voice box formed by thyroid, cricoid, and arytenoid cartilages. Vocal folds vibrate at 100–300 Hz for phonation.',
  },
  {
    id: 'muscle',
    label: 'Muscle Tissue',
    file: `${MODELS_3D_BASE}/muscle.glb`,
    color: '#dd4444',
    system: 'Muscular',
    info: 'Skeletal muscle microstructure: fascicles, muscle fibres, myofibrils, and sarcomere organization for force generation.',
  },
  {
    id: 'rigged_mouth',
    label: 'Mouth & Oral Cavity',
    file: `${MODELS_3D_BASE}/rigged_mouth.glb`,
    color: '#ff8866',
    system: 'Digestive',
    info: 'Oral cavity with tongue, teeth, and soft palate. Articulated rig shows jaw mechanics and tongue movement range.',
  },
  {
    id: 'uterus',
    label: 'Uterus',
    file: `${MODELS_3D_BASE}/uterus.glb`,
    color: '#ff7799',
    system: 'Reproductive',
    info: 'Pear-shaped muscular organ. ~60g (non-pregnant). Fundus, body, isthmus, cervix. Endometrium cycles monthly under hormonal control.',
  },
  {
    id: 'male_reproductive',
    label: 'Male Reproductive System',
    file:  `${MODELS_3D_BASE}/male_reproductive_system.glb`,
    color: '#5599cc',
    system: 'Reproductive',
    info: 'Testes, epididymis, vas deferens, seminal vesicles, prostate, and urethra shown in anatomical relationship.',
  },
];

// ─── Group by system ──────────────────────────────────────────────────────────
const SYSTEMS = Array.from(new Set(ORGANS.map(o => o.system)));

type SceneState = {
  renderer: THREE.WebGLRenderer;
  orbitControls: OrbitControls | null;
  model: THREE.Object3D | null;
};

function setMaterialWireframe(material: THREE.Material, enabled: boolean): void {
  if ('wireframe' in material) {
    (material as THREE.MeshStandardMaterial).wireframe = enabled;
  }
}

function applyWireframeToObject(object: THREE.Object3D, enabled: boolean): void {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if (material) setMaterialWireframe(material, enabled);
      });
    }
  });
}

const Viewer3D: React.FC = () => {
  const mountRef  = useRef<HTMLDivElement>(null);
  const sceneRef  = useRef<SceneState | null>(null);
  const animRef   = useRef<number>(0);

  const [active, setActive]           = useState(
    ORGANS.find(o => o.id === 'realistic_human_heart') ?? ORGANS[0]
  );
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError]   = useState('');
  const [filterSystem, setFilterSystem] = useState<string>('All');
  const [autoRotate, setAutoRotate]   = useState(true);
  const [wireframe, setWireframe]     = useState(false);

  // ── Build scene & load model whenever active organ changes ───────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    cancelAnimationFrame(animRef.current);
    if (sceneRef.current?.renderer) {
      sceneRef.current.renderer.dispose();
      while (el.firstChild) el.removeChild(el.firstChild);
    }

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2235);

    const grid = new THREE.GridHelper(20, 30, 0x2a3a55, 0x1e2d44);
    grid.position.y = -2;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.01, 1000);
    camera.position.set(0, 0.3, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
    keyLight.position.set(5, 8, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width  = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xadd8ff, 2.5);
    fillLight.position.set(-6, 3, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfff0cc, 2.0);
    rimLight.position.set(0, -3, -6);
    scene.add(rimLight);

    const frontLight = new THREE.PointLight(0xffffff, 3.0, 15);
    frontLight.position.set(0, 1, 4);
    scene.add(frontLight);

    const pointLight = new THREE.PointLight(new THREE.Color(active.color), 1.2, 12);
    pointLight.position.set(3, 3, 3);
    scene.add(pointLight);

    const bottomLight = new THREE.PointLight(0xffffff, 1.5, 8);
    bottomLight.position.set(0, -4, 1);
    scene.add(bottomLight);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping   = true;
    orbitControls.dampingFactor   = 0.06;
    orbitControls.autoRotate      = autoRotate;
    orbitControls.autoRotateSpeed = 1.0;
    orbitControls.minDistance     = 0.4;
    orbitControls.maxDistance     = 12;
    orbitControls.enablePan       = true;
    orbitControls.panSpeed        = 0.6;

    setModelLoading(true);
    setModelError('');

    const loader = new GLTFLoader();
    loader.load(
      active.file,
      (gltf) => {
        const model = gltf.scene;

        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.4 / maxDim;

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow    = true;
            mesh.receiveShadow = true;
            if (wireframe) applyWireframeToObject(mesh, true);
          }
        });

        scene.add(model);
        if (sceneRef.current) sceneRef.current.model = model;
        setModelLoading(false);
      },
      undefined,
      (err) => {
        const name = active.file.split('/').pop() ?? 'model';
        const detail = err instanceof Error ? err.message : String(err);
        setModelError(
          `Could not load ${name} from ${active.file}. ` +
          `Restart the backend (npm start) so /api/3d-models is available. ${detail}`
        );
        setModelLoading(false);

        const geo      = new THREE.IcosahedronGeometry(1, 2);
        const matSolid = new THREE.MeshPhongMaterial({
          color: new THREE.Color(active.color), transparent: true, opacity: 0.18,
        });
        const matWire  = new THREE.MeshBasicMaterial({
          color: new THREE.Color(active.color), wireframe: true, transparent: true, opacity: 0.22,
        });
        scene.add(new THREE.Mesh(geo, matSolid));
        scene.add(new THREE.Mesh(geo.clone(), matWire));
      }
    );

    sceneRef.current = { renderer, orbitControls, model: null };

    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      orbitControls.dispose();
      renderer.dispose();
    };
  }, [active]);

  useEffect(() => {
    if (!sceneRef.current?.model) return;
    applyWireframeToObject(sceneRef.current.model, wireframe);
  }, [wireframe]);

  useEffect(() => {
    if (sceneRef.current?.orbitControls) {
      sceneRef.current.orbitControls.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  const filteredOrgans = filterSystem === 'All'
    ? ORGANS
    : ORGANS.filter(o => o.system === filterSystem);

  return (
    <div style={{
      position: 'relative', zIndex: 1,
      maxWidth: 1400, margin: '0 auto',
      padding: '3.5rem 3rem',
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="fade-in" style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          marginBottom: 18,
          background: 'rgba(180,123,255,0.06)',
          border: '1px solid rgba(180,123,255,0.22)',
          borderRadius: 100, padding: '8px 20px',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b47bff', display: 'inline-block' }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
            color: '#b47bff', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          }}>
            Three.js · GLTFLoader · {ORGANS.length} Medical Models · WebGL
          </span>
        </div>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
          fontWeight: 900, letterSpacing: -2.5, color: TEXT,
          marginBottom: 10, lineHeight: 1,
        }}>
          3D Anatomy Viewer
        </h1>
        <p style={{ color: DIM, fontSize: 17, maxWidth: 620, lineHeight: 1.7 }}>
          Real anatomical GLB models. Drag to rotate · Scroll to zoom · Right-click to pan.
        </p>
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22 }}>

        {/* ── LEFT: Viewport + controls ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 3D Canvas */}
          <div
            ref={mountRef}
            style={{
              height: 540, borderRadius: 18, overflow: 'hidden',
              border: `1px solid ${active.color}28`,
              boxShadow: `0 0 60px ${active.color}12, inset 0 0 30px rgba(0,0,0,0.3)`,
              cursor: 'grab', position: 'relative' as const,
              background: '#040c18',
            }}
            onMouseDown={e => (e.currentTarget.style.cursor = 'grabbing')}
            onMouseUp={e => (e.currentTarget.style.cursor = 'grab')}
          >
            {/* Top-left label */}
            <div style={{
              position: 'absolute', top: 16, left: 18, zIndex: 5,
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(4,12,24,0.8)',
              border: `1px solid ${active.color}30`,
              borderRadius: 8, padding: '6px 14px',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: active.color,
                boxShadow: `0 0 10px ${active.color}`,
              }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: active.color, letterSpacing: '0.06em',
              }}>
                {active.label}
              </span>
            </div>

            {/* Top-right toggle controls */}
            <div style={{
              position: 'absolute', top: 16, right: 16, zIndex: 5,
              display: 'flex', gap: 8,
            }}>
              {[
                { label: autoRotate ? '⏸ Auto' : '▶ Auto', action: () => setAutoRotate(v => !v), active: autoRotate },
                { label: wireframe ? '◈ Wire' : '◉ Solid', action: () => setWireframe(v => !v), active: wireframe },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  style={{
                    background: btn.active ? `${active.color}20` : 'rgba(4,12,24,0.8)',
                    border: `1px solid ${btn.active ? active.color + '50' : 'rgba(0,229,255,0.12)'}`,
                    borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: btn.active ? active.color : DIMMER,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Loading overlay */}
            {modelLoading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(4,12,24,0.88)', zIndex: 10,
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: DIM }}>
                  Loading {active.label}…
                </p>
              </div>
            )}
          </div>

          {/* Error banner */}
          {modelError && (
            <div style={{
              background: 'rgba(255,170,0,0.05)',
              border: '1px solid rgba(255,170,0,0.2)',
              borderRadius: 10, padding: '12px 16px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, color: '#ffaa44', lineHeight: 1.7,
            }}>
              ⚠ {modelError}
            </div>
          )}

          {/* Controls hint row */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', paddingTop: 2 }}>
            {[['Drag', 'Rotate'], ['Scroll', 'Zoom'], ['Right-click', 'Pan']].map(([key, val]) => (
              <span key={key} style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: 'rgba(0,229,255,0.35)',
              }}>
                {key} <span style={{ color: DIMMER }}>→ {val}</span>
              </span>
            ))}
          </div>

          {/* Clinical info card */}
          <div className="glass" style={{ borderRadius: 14, padding: '20px 24px' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12,
            }}>
              Clinical Data
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8 }}>
              <p style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 20, color: active.color, margin: 0,
              }}>
                {active.label}
              </p>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: DIMMER, padding: '2px 8px',
                background: 'rgba(0,229,255,0.05)',
                border: '1px solid rgba(0,229,255,0.1)',
                borderRadius: 4,
              }}>
                {active.system} System
              </span>
            </div>
            <p style={{ fontSize: 14, color: DIM, lineHeight: 1.85, margin: 0 }}>{active.info}</p>
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: '1px solid rgba(0,229,255,0.07)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: DIMMER }}>File:</span>
              <code style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
                background: 'rgba(0,229,255,0.06)', padding: '3px 10px', borderRadius: 5,
              }}>
                {active.file.split('/').pop()}
              </code>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Model selector sidebar ──────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* System filter */}
          <div className="glass" style={{ borderRadius: 14, padding: '16px 18px' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10,
            }}>
              Filter by System
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['All', ...SYSTEMS].map(sys => (
                <button
                  key={sys}
                  onClick={() => setFilterSystem(sys)}
                  style={{
                    padding: '5px 11px', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    background: filterSystem === sys ? 'rgba(0,229,255,0.12)' : 'rgba(0,8,20,0.6)',
                    border: `1px solid ${filterSystem === sys ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.08)'}`,
                    color: filterSystem === sys ? '#00e5ff' : DIMMER,
                    transition: 'all 0.15s',
                  }}
                >
                  {sys}
                </button>
              ))}
            </div>
          </div>

          {/* Model list */}
          <div className="glass" style={{ borderRadius: 14, padding: '18px 18px', flex: 1 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Select Model</span>
              <span style={{ color: DIMMER }}>{filteredOrgans.length}/{ORGANS.length}</span>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              maxHeight: 520, overflowY: 'auto',
              paddingRight: 4,
            }}>
              {filteredOrgans.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setActive(o); setModelError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9,
                    background: active.id === o.id ? `${o.color}10` : 'rgba(0,8,20,0.45)',
                    border: `1px solid ${active.id === o.id ? o.color + '40' : 'rgba(0,229,255,0.06)'}`,
                    cursor: 'pointer', transition: 'all 0.14s',
                    textAlign: 'left' as const,
                  }}
                >
                  <div style={{
                    width: 3, height: 24, borderRadius: 2, flexShrink: 0,
                    background: active.id === o.id ? o.color : 'rgba(255,255,255,0.08)',
                    boxShadow: active.id === o.id ? `0 0 8px ${o.color}` : 'none',
                    transition: 'all 0.14s',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 13, fontWeight: 600,
                      color: active.id === o.id ? TEXT : DIM,
                      margin: 0, marginBottom: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {o.label}
                    </p>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                      color: active.id === o.id ? o.color : DIMMER,
                      margin: 0,
                    }}>
                      {o.system}
                    </p>
                  </div>

                  {active.id === o.id && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: o.color, boxShadow: `0 0 8px ${o.color}`,
                    }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewer3D;
