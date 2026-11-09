# 실행 방법

Docker만 있으면 프론트엔드, 백엔드, PostgreSQL을 한 번에 띄울 수 있습니다.

```text
브라우저 → nginx (localhost:TEAM_PORT) → frontend:3000 → backend:8080 → db:5432
```

브라우저는 nginx만 거쳐 프론트엔드에 접속합니다. 백엔드는 프론트엔드가 서버 안에서 부르므로(BFF) 호스트에 포트를 열지 않습니다.

## 처음 한 번

```sh
cp .env.example .env
```

`.env`에서 `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`를 채웁니다. 로컬에서는 아무 값이나 써도 됩니다. `JWT_SECRET`과 `CASHOUT_ACCOUNT_CRYPTO_KEY`도 필수이고, 만드는 방법은 `.env.example`의 주석에 있습니다. `TEAM_PORT`는 브라우저로 접속할 포트입니다. `.env`는 커밋하지 않습니다.

## 개발 모드

```sh
docker compose up --build
```

`http://localhost:<TEAM_PORT>`로 접속합니다. `compose.override.yaml`이 자동으로 합쳐져 소스 폴더가 컨테이너에 붙습니다.

- 프론트엔드: 파일을 저장하면 바로 반영됩니다.
- 백엔드: 고친 뒤 `docker compose restart backend`로 다시 시작합니다.

프론트엔드는 실제 백엔드에 연결되어 뜹니다. 목업으로 확인하려면 `.env`에 `AUTH_MODE=mock`을 추가하고 `docker compose up`으로 컨테이너를 다시 만듭니다. 아래의 운영 이미지로 띄울 때는 이 값이 빌드에 들어가므로 `--build`까지 붙입니다. 테스트 서버는 이 값과 상관없이 항상 백엔드 모드입니다.

## 운영 이미지로 띄우기

```sh
docker compose -f compose.yaml up --build
```

`compose.override.yaml`을 빼고 운영과 같은 이미지로 빌드해 띄웁니다. 배포 전에 이미지가 제대로 뜨는지 볼 때 씁니다.

## 로컬 HTTPS

[mkcert](https://github.com/FiloSottile/mkcert)로 인증서를 만든 뒤 `https` 프로필을 붙여 띄웁니다. 인증서는 `nginx/certs/`에 생기고 커밋하지 않습니다.

```sh
mkcert -install
mkcert -cert-file nginx/certs/local.pem -key-file nginx/certs/local-key.pem localhost 127.0.0.1 ::1
docker compose --profile https up --build
```

`https://localhost:<HTTPS_PORT>`로 접속합니다. `HTTP_PORT`로 들어오면 HTTPS로 넘어갑니다.

## 자주 쓰는 명령

| 명령 | 하는 일 |
| --- | --- |
| `docker compose ps` | 컨테이너 상태 |
| `docker compose logs -f backend` | 한 서비스의 로그 |
| `docker compose down` | 컨테이너 중지·삭제. DB 데이터는 남음 |
| `docker compose down -v` | DB 데이터까지 삭제 |

## 테스트 서버 배포
