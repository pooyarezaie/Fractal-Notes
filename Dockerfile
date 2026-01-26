FROM ruby:3.2-alpine AS build

RUN apk add --no-cache build-base

WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle config set without "development test" \
  && bundle install --jobs 4

COPY . .
RUN bundle exec jekyll build --destination /app/_site

FROM nginx:1.27-alpine
COPY --from=build /app/_site /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
