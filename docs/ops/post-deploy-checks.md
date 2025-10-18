# ✅ Post-Deploy Smoke & Rollback Guide

## 🧪 Post-Deploy Smoke Test (Manual QA)

After every production deploy (Netlify → Functions → Play release):

### Health Endpoint
- Run:  
  ```bash
  curl https://YOUR-SITE.netlify.app/health
