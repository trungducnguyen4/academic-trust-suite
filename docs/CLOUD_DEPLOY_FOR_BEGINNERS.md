# Deploy Cloud Cho Nguoi Moi

Tai lieu nay huong dan deploy theo cach it thao tac nhat:

- Frontend React len Cloudflare Pages
- Backend NestJS len Oracle Always Free bang Docker Compose
- AI worker chay rieng khoi API
- Redis, MySQL va Ollama chi nam trong private Docker network

Muc tieu: chay duoc production/demo thesis ma khong can kinh nghiem hosting sau.

## 1) Kien truc deploy

Project nay gom cac tien trinh rieng:

- `frontend`: React/Vite, build thanh static files tren Cloudflare Pages
- `backend`: NestJS API, nhan request tu frontend
- `ai-worker`: worker nen, lay AI job tu Redis queue
- `redis`: queue, cache, rate-limit state
- `db`: MySQL 8
- `ollama`: local model runtime cho AI
- `nginx`: reverse proxy public port 80 toi backend

Dieu quan trong:

- AI khong chay truc tiep trong request cua user.
- Backend tao job va dua vao Redis.
- `ai-worker` xu ly job sau, goi Ollama, roi ghi ket qua ve database.
- Redis, MySQL, Ollama khong expose port ra internet.

## 2) Deploy frontend len Cloudflare Pages

Cloudflare Pages chi can build frontend thanh file tinh.

Thiet lap trong Cloudflare Pages:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: de trong neu repo nay la repo deploy truc tiep

Environment variable cua frontend:

```bash
VITE_API_BASE_URL=https://api.example.com/api
```

Neu ban chua co domain rieng, co the tam thoi dung IP/domain cua Oracle:

```bash
VITE_API_BASE_URL=http://YOUR_ORACLE_PUBLIC_IP/api
```

Sau khi co HTTPS/domain that, doi lai bien nay trong Cloudflare Pages va redeploy frontend.

## 3) Chuan bi Oracle Always Free

Tren Oracle VM, cai Docker va Docker Compose plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Dang xuat SSH va dang nhap lai, sau do kiem tra:

```bash
docker --version
docker compose version
```

Firewall can mo:

- Oracle Security List: TCP `80`, va `443` neu co HTTPS
- Ubuntu firewall neu bat UFW: `sudo ufw allow 80/tcp`

Khong mo port `3306`, `6379`, `11434`.

## 4) Tao file .env tren Oracle

Copy file mau:

```bash
cp ops/env.oracle.example .env
```

Sua cac gia tri `CHANGE_ME...`:

```bash
nano .env
```

Toi thieu phai sua:

- `FRONTEND_URL`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_PASSWORD`

Luu y: mat khau trong `DATABASE_URL` phai trung voi `MYSQL_PASSWORD`.

Vi du:

```bash
MYSQL_PASSWORD=MyStrongDbPassword123
DATABASE_URL=mysql://examtrust:MyStrongDbPassword123@db:3306/examtrust
```

## 5) Chay backend, worker, Redis, MySQL

Len Oracle VM, tai source code va vao folder project:

```bash
git clone <YOUR_REPO_URL>
cd academic-trust-suite
cp ops/env.oracle.example .env
nano .env
```

Build va chay production:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
```

Lenh tren se:

1. Build image backend.
2. Start MySQL va Redis.
3. Chay `prisma migrate deploy` mot lan.
4. Start backend API.
5. Start `ai-worker`.

Kiem tra container:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml ps
```

Xem log API:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f backend
```

Xem log worker:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f ai-worker
```

Kiem tra API:

```bash
curl http://localhost/api
curl http://YOUR_ORACLE_PUBLIC_IP/docs
```

Neu `/api` tra 404 nhung backend co log dang chay thi van co the binh thuong, vi app dung cac route cu the nhu `/api/auth/login`.

## 6) Bat Ollama AI local

Mac dinh Docker Compose se chay Ollama trong private network, khong public port `11434` ra internet.

Tai model vao container:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec ollama ollama pull gemma3:4b
```

Kiem tra model:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec ollama ollama list
```

Neu VM khong du RAM cho model, doi sang provider mock de demo luong job:

```bash
AI_PROVIDER=mock
```

Sau do restart:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d
```

## 7) Cap nhat version moi

Moi lan pull code moi:

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
```

Migration production dung `prisma migrate deploy`, khong seed lai data va khong reset database.

Khong chay cac lenh nay tren production tru khi ban that su muon pha data:

```bash
prisma migrate reset
docker compose down -v
```

## 8) Backup database co ban

Tao backup:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec db sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > backup.sql
```

Restore backup vao database rong:

```bash
cat backup.sql | docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec -T db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

Nen backup truoc moi dot deploy co migration.

## 9) Checklist truoc khi public

- Frontend build duoc bang `npm run build`
- `VITE_API_BASE_URL` tro dung backend public URL
- Backend build duoc trong Docker
- `.env` tren Oracle da doi het `CHANGE_ME`
- `CORS_ORIGINS` chi gom domain frontend that
- MySQL, Redis, Ollama khong public port
- `ai-worker` dang chay rieng voi backend
- Da backup database truoc khi apply migration moi

Khi checklist nay dat, ban co the dung Cloudflare Pages cho frontend va Oracle VM cho backend production/demo.
