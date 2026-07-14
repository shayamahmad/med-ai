FROM node:20-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL=http://localhost:8000
ARG REACT_APP_HF_ASSETS_REPO=
ARG REACT_APP_3D_MODELS_BASE=
ARG REACT_APP_HF_REPO_TYPE=dataset

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_HF_ASSETS_REPO=$REACT_APP_HF_ASSETS_REPO
ENV REACT_APP_3D_MODELS_BASE=$REACT_APP_3D_MODELS_BASE
ENV REACT_APP_HF_REPO_TYPE=$REACT_APP_HF_REPO_TYPE

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8000/; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]