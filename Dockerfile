# Stage 1: Build the Rust WASM rewriter
FROM rust:1.85-bookworm AS rust-builder

RUN rustup default nightly && \
    rustup target add wasm32-unknown-unknown --toolchain nightly && \
    rustup component add rust-src --toolchain nightly

RUN cargo install wasm-bindgen-cli --version 0.2.100
RUN apt-get update && apt-get install -y binaryen && rm -rf /var/lib/apt/lists/*
RUN cargo install --git https://github.com/r58playz/wasm-snip wasm-snip

WORKDIR /app
COPY rewriter/ rewriter/
RUN mkdir -p dist

WORKDIR /app/rewriter/wasm
RUN bash build.sh

# Stage 2: Build JS with rspack
FROM node:22-bookworm-slim AS node-builder

RUN npm install -g pnpm@9

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY . .
COPY --from=rust-builder /app/dist/scramjet.wasm.wasm dist/
COPY --from=rust-builder /app/rewriter/wasm/out/ rewriter/wasm/out/

RUN pnpm build

# Stage 3: Production runtime
FROM node:22-bookworm-slim

RUN npm install -g pnpm@9

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile --prod

COPY --from=node-builder /app/dist/ dist/
COPY static/ static/
COPY assets/ assets/
COPY server.production.js .

EXPOSE 1337

CMD ["node", "server.production.js"]
