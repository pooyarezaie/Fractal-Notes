# Stage 1: Jekyll build
FROM ruby:3.2-alpine AS jekyll-build

RUN apk add --no-cache build-base

WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle config set without "development test" \
  && bundle install --jobs 4

COPY . .
RUN bundle exec jekyll build --destination /app/_site

# Stage 2: Prerender (Playwright) — HTML/CSS only, KaTeX and JS baked in
FROM node:20-bookworm AS prerender

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium

COPY scripts/ scripts/
COPY --from=jekyll-build /app/_site /app/_site

RUN node scripts/prerender.js

# Stage 3: nginx serves prerendered static HTML/CSS
FROM nginx:1.27-alpine

COPY --from=prerender /app/_site /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
