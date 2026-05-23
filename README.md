# MedAI — Medical AI Learning Platform

A full-stack medical AI platform featuring 8 specialized CNN models, RAG-powered clinical tutoring, Grad-CAM explainability, symptom checking, and interactive 3D anatomy visualization.

**Live Demo:** `http://16.170.204.191/`  


---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Three.js, Tailwind CSS |
| Backend | FastAPI, PyTorch, Python 3.11 |
| ML Models | ResNet50, DenseNet121, EfficientNetB0, ResNet34 |
| RAG System | ChromaDB, Mistral AI, Sentence Transformers |
| Storage | AWS S3 (models + assets) |
| Deployment | AWS EC2, Docker, Docker Compose |

---

## Features

### Disease Detection (7 CNN Models)
| Scan Type | Model | Classes |
|---|---|---|
| Chest X-Ray | DenseNet121 | COVID-19, Pneumonia, TB, Lung Opacity, Normal |
| Brain MRI | ResNet50 | Glioma, Meningioma, No Tumor, Pituitary |
| Eye Fundus | ResNet50 | 9 ocular conditions |
| Skin Lesion | EfficientNetB0 | 7 classes — HAM10000 |
| Bone X-Ray | ResNet34 | Fractured, Normal |
| Knee MRI | ResNet50 | KL Grade 0–4 (Osteoarthritis) |
| Dental X-Ray | ResNet50 | 6 dental pathology classes |

### Other Features
- **Organ Classifier** — ResNet50, 14 organ classes
- **Auto Pipeline** — detects organ → routes to disease model automatically
- **Grad-CAM** — visual explainability heatmaps for every prediction
- **RAG AI Tutor** — ChromaDB + Mistral LLM, 88K+ medical document chunks
- **Symptom Checker** — clinical differential diagnosis via Mistral RAG
- **Medical Knowledge Base** — ask any anatomy/pathology/physiology question
- **3D Anatomy Viewer** — real GLB models via Three.js GLTFLoader
- **Diagnostic Quiz** — test your medical imaging knowledge

---

## Project Structure

```
AI Doctor Help/
├── backend/
│   ├── main.py               # FastAPI app, 18 routes
│   ├── model_loader.py       # Singleton model registry
│   ├── image_utils.py        # Preprocessing + inference
│   ├── gradcam.py            # Grad-CAM implementation
│   ├── rag_system.py         # ChromaDB + Mistral RAG
│   ├── symptom_checker.py    # Symptom → RAG pipeline
│   └── ingest.py             # PDF/TXT → ChromaDB ingestion
├── medai-frontend/
│   ├── public/
│   │   └── models/           # GLB 3D organ models
│   └── src/
│       ├── pages/            # 8 page components
│       ├── components/       # Navbar, ImageUploader, ConfidenceBar
│       ├── api/              # Axios API client
│       └── types/            # TypeScript interfaces
├── models/                   # Trained .pth model files (or S3)
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- CUDA GPU (optional, CPU works too)
- AWS credentials (for S3)

### Backend Setup

```bash
# Create conda environment
conda create -n medrag python=3.11
conda activate medrag

# Install dependencies
cd "AI Doctor Help"
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your keys

# Ingest documents into ChromaDB
python -m backend.ingest

# Start backend
uvicorn backend.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd medai-frontend
npm install
npm start
# Opens at http://localhost:3000
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Mistral AI
MISTRAL_API_KEY=your_mistral_key_here

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Backend URL (for frontend)
REACT_APP_API_URL=http://localhost:8000
```

---

## Docker Deployment

### Build and Run

```bash
# Build both images
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop
docker-compose down
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped

  frontend:
    build:
      context: ./medai-frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://<your-ec2-ip>:8000
    depends_on:
      - backend
    restart: unless-stopped
```

---

## AWS EC2 Deployment

### Instance Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu
newgrp docker

# Clone repository
git clone <your-repo-url>
cd "AI Doctor Help"

# Set environment variables
nano .env

# Deploy
docker-compose up -d
```

### EC2 Security Group — Open these ports

| Port | Purpose |
|---|---|
| 22 | SSH |
| 8000 | FastAPI backend |
| 3000 | React frontend |
| 80 | HTTP (optional) |
| 443 | HTTPS (optional) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | System health + model status |
| POST | `/classify/organ` | Organ classification (14 classes) |
| POST | `/classify/chest` | Chest X-ray disease detection |
| POST | `/classify/brain` | Brain MRI tumor classification |
| POST | `/classify/eye` | Eye disease classification |
| POST | `/classify/skin` | Skin lesion classification |
| POST | `/classify/bone` | Bone fracture detection |
| POST | `/classify/knee` | Knee OA grading |
| POST | `/classify/dental` | Dental pathology |
| POST | `/classify/auto` | Auto organ → disease pipeline |
| POST | `/explain/gradcam` | Grad-CAM heatmap |
| POST | `/rag/query` | RAG medical Q&A |
| POST | `/symptom-check` | Symptom differential diagnosis |

Full interactive docs at `/docs` (Swagger UI).

---

## Trained Models

| Model | Architecture | Dataset | Classes | Notes |
|---|---|---|---|---|
| organ_model_v2 | ResNet50 | Multi-organ | 14 | Custom head with BatchNorm |
| chest_model | DenseNet121 | COVID-19 Radiography | 5 | Transfer learning |
| brain_model | ResNet50 | Br35H + Figshare | 4 | Dropout regularization |
| eye_model | ResNet50 | ODIR-5K | 9 | Multi-label |
| skin_model | EfficientNetB0 | HAM10000 | 7 | Custom normalization |
| bone_model | ResNet34 | MURA Dataset | 2 | Binary classifier |
| knee_model | ResNet50 | OAI + Kaggle KL | 5 | KL grading scale |
| dental_model | ResNet50 | Dental Panoramic | 6 | Transfer learning |

---

## Disclaimer

This platform is for **educational and research purposes only**. It is not intended for clinical use, medical diagnosis, or treatment decisions. Always consult a qualified medical professional.

---

## License

MIT License — free to use, modify, and distribute.