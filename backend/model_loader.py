import torch
import torch.nn as nn
from torchvision import models
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# ───────────────────────────────────────────────────────────
# Paths
# ───────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent

MODELS_DIR = BASE_DIR / "models"

# ───────────────────────────────────────────────────────────
# Metadata Loader
# ───────────────────────────────────────────────────────────

def load_metadata(folder, filename):

    path = MODELS_DIR / folder / filename

    with open(path, "r") as f:
        return json.load(f)

# ───────────────────────────────────────────────────────────
# Organ → disease model mapping
# ───────────────────────────────────────────────────────────

organ_to_disease_model = {
    "Lung_Chest": "chest",
    "Lung_Left": "chest",
    "Lung_Right": "chest",

    "Brain": "brain",

    "Eye_Cornea": "eye",
    "Eye_DR": "eye",
    "Eye_Degeneration": "eye",
    "Eye_Glaucoma": "eye",
    "Eye_Maculopathy": "eye",
    "Eye_Normal": "eye",
    "Eye_OCT": "eye",
    "Eye_Other": "eye",
    "Eye_Vascular": "eye",

    "Skin": "skin",

    "Bone": "bone",
    "Knee": "knee",

    "Teeth": "dental",
}

# ───────────────────────────────────────────────────────────
# Model builders
# ───────────────────────────────────────────────────────────

def _resnet50_v1(num_classes):

    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes)
    )

    return m


def _skin_resnet50(num_classes):

    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes)
    )

    return m


def _organ_resnet50(num_classes):

    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.BatchNorm1d(512),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes)
    )

    return m


def _bone_resnet50(num_classes):

    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes)
    )

    return m

# ───────────────────────────────────────────────────────────
# Generic model loader
# ───────────────────────────────────────────────────────────

def _load_model(folder_name, filename, build_fn, num_classes, device):

    path = MODELS_DIR / folder_name / filename

    if not path.exists():
        logger.warning(f"Model not found: {path}")
        return None

    try:

        model = build_fn(num_classes)

        state = torch.load(
            path,
            map_location=device,
            weights_only=True
        )

        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]

        elif isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]

        model.load_state_dict(state)

        model.to(device)

        model.eval()

        logger.info(f"Loaded model: {path}")

        return model

    except Exception as e:

        logger.error(f"Error loading {path}: {e}")

        return None

# ───────────────────────────────────────────────────────────
# Registry
# ───────────────────────────────────────────────────────────

class ModelRegistry:

    def __init__(self):

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        logger.info(f"Device: {self.device}")

        # Models
        self.organ = None
        self.chest = None
        self.brain = None
        self.eye = None
        self.skin = None
        self.bone = None
        self.knee = None
        self.dental = None

        # Metadata placeholders
        self.organ_meta = None
        self.bone_meta = None
        self.brain_meta = None
        self.chest_meta = None
        self.dental_meta = None
        self.eye_meta = None
        self.knee_meta = None
        self.skin_meta = None

        self.labels = {}

    # ───────────────────────────────────────────────────────

    def load_metadata_files(self):

        self.organ_meta = load_metadata(
            "organ_detection",
            "organ_metadata_v2.json"
        )

        self.bone_meta = load_metadata(
            "bone_model",
            "bone_metadata.json"
        )

        self.brain_meta = load_metadata(
            "brain_model",
            "brain_metadata.json"
        )

        self.chest_meta = load_metadata(
            "chest_model",
            "chest_metadata.json"
        )

        self.dental_meta = load_metadata(
            "dental_model",
            "dental_metadata.json"
        )

        self.eye_meta = load_metadata(
            "eye_model",
            "eye_metadata.json"
        )

        self.knee_meta = load_metadata(
            "knee_model",
            "knee_metadata.json"
        )

        self.skin_meta = load_metadata(
            "skin_model",
            "skin_metadata.json"
        )

        self.labels = {
            "organ": self.organ_meta["classes"],
            "chest": self.chest_meta["classes"],
            "brain": self.brain_meta["classes"],
            "eye": self.eye_meta["classes"],
            "skin": self.skin_meta["classes"],
            "bone": self.bone_meta["classes"],
            "knee": self.knee_meta["classes"],
            "dental": self.dental_meta["classes"],
        }

    # ───────────────────────────────────────────────────────

    def load_all_models(self):

        self.load_metadata_files()

        self.organ = _load_model(
            "organ_detection",
            "organ_model_v2.pth",
            _organ_resnet50,
            self.organ_meta["num_classes"],
            self.device
        )

        self.chest = _load_model(
            "chest_model",
            "chest_model.pth",
            _resnet50_v1,
            self.chest_meta["num_classes"],
            self.device
        )

        self.brain = _load_model(
            "brain_model",
            "brain_model.pth",
            _resnet50_v1,
            self.brain_meta["num_classes"],
            self.device
        )

        self.skin = _load_model(
            "skin_model",
            "skin_model.pth",
            _skin_resnet50,
            self.skin_meta["num_classes"],
            self.device
        )

        self.eye = _load_model(
            "eye_model",
            "eye_model.pth",
            _resnet50_v1,
            self.eye_meta["num_classes"],
            self.device
        )

        self.bone = _load_model(
            "bone_model",
            "bone_model.pth",
            _bone_resnet50,
            self.bone_meta["num_classes"],
            self.device
        )

        self.knee = _load_model(
            "knee_model",
            "knee_model.pth",
            _resnet50_v1,
            self.knee_meta["num_classes"],
            self.device
        )

        self.dental = _load_model(
            "dental_model",
            "dental_model.pth",
            _resnet50_v1,
            self.dental_meta["num_classes"],
            self.device
        )

    # ───────────────────────────────────────────────────────

    def get(self, name: str):

        return getattr(self, name, None)

    # ───────────────────────────────────────────────────────

    def status(self):

        return {
            "organ": self.organ is not None,
            "chest": self.chest is not None,
            "brain": self.brain is not None,
            "eye": self.eye is not None,
            "skin": self.skin is not None,
            "bone": self.bone is not None,
            "knee": self.knee is not None,
            "dental": self.dental is not None,
        }

    # ───────────────────────────────────────────────────────

    def get_disease_model(self, organ_name: str):

        key = organ_to_disease_model.get(organ_name)

        if not key:
            return None, None, None

        return key, self.get(key), self.labels.get(key, [])

# ───────────────────────────────────────────────────────────

registry = ModelRegistry()