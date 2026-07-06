# EC2 + GitHub Auto Deploy + Domain Setup

Yeh guide `Patiala-rural-env` EC2 (`13.234.197.8`) par app deploy karne ke liye hai.

Repo: https://github.com/mmsbywarroom/rural-connect-hub

---

## Step 1: AWS Security Group (zaroori ports)

EC2 → **Security** tab → Security Group → **Edit inbound rules**:

| Type  | Port | Source    |
|-------|------|-----------|
| SSH   | 22   | My IP     |
| HTTP  | 80   | 0.0.0.0/0 |
| HTTPS | 443  | 0.0.0.0/0 |

Port **8080** ko public mat kholo — sirf nginx use karega.

---

## Step 2: EC2 par SSH karo

AWS Console → EC2 → **Connect** → SSH.

Windows (PowerShell):

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@13.234.197.8
```

> Agar `ubuntu` kaam na kare to `ec2-user` try karo (Amazon Linux).

---

## Step 3: EC2 par .env set karo

Pehli baar setup:

```bash
curl -fsSL https://raw.githubusercontent.com/mmsbywarroom/rural-connect-hub/main/scripts/ec2-setup.sh -o ec2-setup.sh
# Ya repo clone ke baad:
cd ~/rural-connect-hub
bash scripts/ec2-setup.sh
```

`.env` edit karo (apne local `.env` se values copy karo — **GitHub par kabhi mat daalo**):

```bash
nano ~/rural-connect-hub/.env
```

Zaroori variables: `DATABASE_URL`, `SESSION_SECRET`, `SMTP_*`, `FAST2SMS_*`, `GOOGLE_*`, `VAPID_*`, `VITE_*`.

Save: `Ctrl+O`, Enter, `Ctrl+X`

App restart:

```bash
cd ~/rural-connect-hub
pm2 restart rural-connect-hub
```

---

## Step 4: GitHub Actions auto-deploy

Jab bhi `main` branch par **push** hoga, app EC2 par auto update hogi.

### GitHub Secrets add karo

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name     | Value                                      |
|-----------------|--------------------------------------------|
| `EC2_HOST`      | `13.234.197.8`                             |
| `EC2_USER`      | `ubuntu` (ya `ec2-user`)                   |
| `EC2_SSH_KEY`   | Poora `.pem` private key file ka content   |
| `EC2_APP_PATH`  | `/home/ubuntu/rural-connect-hub`           |

### Deploy files push karo

Local machine se (pehli baar workflow files ke saath):

```powershell
cd "C:\Users\prash\Downloads\Rural-Connect-Hub\Rural-Connect-Hub"
git add .github scripts ecosystem.config.cjs deploy DEPLOY_EC2.md
git commit -m "Add EC2 auto-deploy workflow"
git push origin main
```

Uske baad har `git push origin main` par auto deploy hoga.

Deploy status: GitHub → **Actions** tab.

---

## Step 5: Domain connect (balbirs.com)

### DNS (domain registrar par)

| Type | Name | Value          |
|------|------|----------------|
| A    | @    | 13.234.197.8   |
| A    | www  | 13.234.197.8   |

DNS propagate hone mein 5–30 min lag sakte hain.

### EC2 par SSL + nginx

Auto-deploy ab har release par `deploy/apply-nginx.sh` chalata hai — static JS/CSS seedha disk se serve hote hain.

Manual update (pehli baar ya SSL issue ho to):

```bash
cd ~/rural-connect-hub
bash deploy/apply-nginx.sh ~/rural-connect-hub
```

Purana template: `deploy/nginx-domain.conf` (sirf HTTP, SSL se pehle).

```bash
sudo certbot --nginx -d balbirs.com -d www.balbirs.com
```

### Google OAuth (agar use ho raha hai)

Google Cloud Console → OAuth credentials → **Authorized redirect URIs** mein add karo:

```
https://balbirs.com/api/auth/google/callback
```

(URL apne actual callback path ke hisaab se check karo.)

---

## Useful commands (EC2)

```bash
pm2 status                    # app status
pm2 logs rural-connect-hub    # live logs
pm2 restart rural-connect-hub
curl -I http://127.0.0.1:8080 # local test
sudo systemctl status nginx
```

---

## Troubleshooting

### GitHub Actions deploy fail ho raha hai

**Upload pass, Extract fail** = EC2 par disk full ya `npm install` fail.

EC2 par SSH karke yeh chalao:

```bash
cd ~/rural-connect-hub
git pull origin main
bash deploy/ec2-recover.sh ~/rural-connect-hub
```

Agar disk full ho:

```bash
df -h /
sudo apt-get clean
sudo journalctl --vacuum-size=50M
rm -rf ~/rural-connect-hub/node_modules
```

Phir GitHub Actions se deploy dubara run karo, ya `ec2-recover.sh` chalao.

### Blank white page / `ERR_CONTENT_LENGTH_MISMATCH`

JS/CSS files (~2MB) proxy ke through truncate ho rahe the. Fix: nginx ab `/assets/` seedha `dist/public` se serve karta hai. `git push origin main` ke baad Actions deploy complete hone do, phir hard refresh (`Ctrl+Shift+R`).

EC2 par turant fix (SSH):

```bash
cd ~/rural-connect-hub
git pull origin main   # ya latest deploy ka wait karo
bash deploy/apply-nginx.sh ~/rural-connect-hub
pm2 restart rural-connect-hub
```

---

## Security notes

- `.env` kabhi Git mein commit mat karo.
- EC2 SSH (port 22) sirf apne IP ke liye rakho.
- Agar secrets leak ho gaye hon to rotate karo (DB password, API keys, etc.).
