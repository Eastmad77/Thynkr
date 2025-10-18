## 🚀 Release Process (v8)

1. **Env**
   - Set Netlify env from `/docs/ops/env.netlify.sample.env`
   - Set Functions env from `/docs/ops/env.firebase.sample.env`

2. **Functions**
   ```bash
   cd functions && npm ci && cd ..
   firebase deploy --only functions
   > For smoke-test and rollback instructions, see [`/docs/ops/post-deploy-checks.md`](docs/ops/post-deploy-checks.md)

