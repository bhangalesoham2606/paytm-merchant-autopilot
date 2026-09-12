const fs = require('fs');
const path = require('path');

const dirs = [
  'frontend/app',
  'frontend/components',
  'frontend/lib',
  'backend/src/routes',
  'backend/src/controllers',
  'backend/src/services',
  'backend/src/models',
  'backend/src/middleware',
  'backend/src/utils',
  'agents/orchestrator',
  'agents/analytics',
  'agents/customer',
  'agents/growth',
  'agents/finance',
  'agents/monitoring',
  'agents/action',
  'analytics/metrics',
  'analytics/anomaly_detection',
  'analytics/forecasting',
  'analytics/customer_segmentation',
  'model/dianjin',
  'model/fin_r1',
  'model/prompts',
  'model/evaluation',
  'model/model_adapter',
  'data/raw',
  'data/processed',
  'data/synthetic',
  'data/schemas',
  'integrations/paytm',
  'integrations/whatsapp',
  'integrations/email',
  'digital-twin/schemas',
  'digital-twin/builder',
  'digital-twin/updater',
  'tests/backend',
  'tests/agents',
  'tests/analytics',
  'tests/model',
  'tests/integration',
  'docs/architecture',
  'docs/api',
  'docs/phinite',
  'docs/model-evaluation',
  'docs/demo',
  'scripts'
];

for (const dir of dirs) {
  const fullDir = path.resolve(__dirname, '..', dir);
  fs.mkdirSync(fullDir, { recursive: true });
  const gitkeep = path.join(fullDir, '.gitkeep');
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, '');
  }
}

console.log(`Created ${dirs.length} directories with .gitkeep`);
