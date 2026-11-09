# 의존성: lock 파일 그대로 설치한다
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 개발: --target dev로 골라 next dev를 띄운다. 소스는 볼륨으로 붙이면 고친 내용이 바로 반영된다
# 예) docker build --target dev -t test-moa-frontend-dev .
#     docker run -p 3000:3000 -v "$PWD":/app -v /app/node_modules -v /app/.next test-moa-frontend-dev
FROM deps AS dev
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev"]

# 빌드: next.config.ts의 output: "standalone"으로 실행에 필요한 파일만 모은다
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로 build arg로 받는다
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# 로그인 안내 같은 정적 화면은 빌드할 때 만들어지므로, 실행할 때의 값과 같은 모드로 빌드한다
ARG AUTH_MODE=backend
ENV AUTH_MODE=$AUTH_MODE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 실행: standalone 서버와 정적 파일만 옮긴다
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node

EXPOSE 3000
CMD ["node", "server.js"]
