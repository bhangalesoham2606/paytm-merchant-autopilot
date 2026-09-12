# Paytm Merchant Autopilot 🚀

An autonomous AI copilot and agentic workflow platform built for merchants powered by Paytm transaction data, real-time deterministic analytics, digital twin modeling, and open-source financial reasoning models.

---

## 📁 Project Structure

```text
paytm-merchant-autopilot/
│
├── frontend/                    # Next.js / React application
│   ├── app/                     # App router pages & layouts
│   ├── components/              # Reusable UI component library
│   ├── lib/                     # Client utilities and state management
│   └── ...
│
├── backend/                     # Main API + business logic
│   ├── src/
│   │   ├── routes/              # Express / Fastify API routes
│   │   ├── controllers/         # Request handling logic
│   │   ├── services/            # Business & orchestration services
│   │   ├── models/              # Database schemas / entity definitions
│   │   ├── middleware/          # Auth, validation, rate limiting
│   │   └── utils/               # Shared helpers & loggers
│   └── ...
│
├── agents/                      # Phinite agent definitions & configs
│   ├── orchestrator/            # Master workflow director agent
│   ├── analytics/               # Insights & reporting agent
│   ├── customer/                # Retention & segment interaction agent
│   ├── growth/                  # Campaign & promotion recommendation agent
│   ├── finance/                 # Cash-flow, reconciliation & settlement agent
│   ├── monitoring/              # Fraud, anomaly, & threshold monitoring agent
│   └── action/                  # Autonomous transaction / trigger execution agent
│
├── analytics/                   # Deterministic analytics + ML
│   ├── metrics/                 # KPI calculations (GMV, AOV, churn, repeat rate)
│   ├── anomaly_detection/       # Payment failure & settlement spike detectors
│   ├── forecasting/             # Revenue & inventory prediction engines
│   └── customer_segmentation/   # RFM & behavioural clustering
│
├── model/                       # Open-source financial reasoning layer
│   ├── dianjin/                 # Dianjin financial reasoning adapter/configs
│   ├── fin_r1/                  # Fin-R1 reasoning models
│   ├── prompts/                 # Few-shot prompts, system instructions
│   ├── evaluation/              # Benchmark suites & accuracy evaluations
│   └── model_adapter/           # vLLM / Ollama / HuggingFace inference client
│
├── data/
│   ├── raw/                     # Raw/mock Paytm transactional data
│   ├── processed/               # Cleaned, aggregated feature sets
│   ├── synthetic/               # Demo/test merchant simulation data
│   └── schemas/                 # Data contracts & JSON schemas
│
├── integrations/                # External systems
│   ├── paytm/                   # Paytm Merchant API & Webhooks
│   ├── whatsapp/                # WhatsApp Business API notifications
│   ├── email/                   # Transactional digests & alerts
│   └── ...
│
├── digital-twin/                # Merchant state & real-time context
│   ├── schemas/                 # Digital twin snapshot schema definitions
│   ├── builder/                 # Aggregator compiling merchant state
│   └── updater/                 # Real-time event streaming / delta updates
│
├── tests/
│   ├── backend/                 # API & service unit/integration tests
│   ├── agents/                  # Multi-agent simulation tests
│   ├── analytics/               # Numerical validation tests
│   ├── model/                   # Prompt & reasoning evaluation tests
│   └── integration/             # End-to-end integration tests
│
├── docs/
│   ├── architecture/            # Architecture diagrams & system design
│   ├── api/                     # OpenAPI/Swagger documentation
│   ├── phinite/                 # Agent topology and specifications
│   ├── model-evaluation/        # Benchmarks & reasoning test metrics
│   └── demo/                    # Walkthrough guides & sample runs
│
├── scripts/                     # Setup, seed, evaluation, deployment scripts
│
├── .env.example                 # Example environment variables
├── .gitignore                   # Version control ignores
├── docker-compose.yml           # Local dev containers (Postgres, Redis, services)
├── README.md                    # Project overview & documentation
├── LICENSE                      # MIT License
└── THIRD_PARTY_LICENSES.md      # Open source attributions & licenses
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Python (3.10+) (for model inference & analytics pipelines)
- Docker & Docker Compose (optional for local DB/Redis)

### 2. Environment Setup
```bash
# Copy example environment file
cp .env.example .env
```

### 3. Running with Docker Compose
```bash
docker-compose up -d
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
