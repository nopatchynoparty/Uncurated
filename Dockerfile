FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@9

# Copy manifests first so the install layer is cached until packages change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY artifacts/api-server/package.json    ./artifacts/api-server/
COPY artifacts/taste-app/package.json     ./artifacts/taste-app/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json   ./lib/api-client-react/
COPY lib/api-spec/package.json           ./lib/api-spec/
COPY lib/api-zod/package.json            ./lib/api-zod/
COPY lib/db/package.json                 ./lib/db/
COPY scripts/package.json                ./scripts/

# Install on Linux — no ARM64 binary issues
RUN pnpm install --no-frozen-lockfile

COPY . .
