# Neon Database Setup – Rural Connect Hub

Is project ka **pura database** Neon pe set karne ke steps.

---

## 1. Neon pe database banao

1. **https://neon.tech** pe jao → Sign up / Login.
2. **New Project** banao (e.g. name: `rural-connect-hub`).
3. Region choose karo (e.g. **Singapore** ya **US**).
4. Project create hone ke baad **Connection string** dikhega.  
   Format:  
   `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require`
5. Is string ko copy karo — ye tumhara **DATABASE_URL** hoga.

---

## 2. Local `.env` mein DATABASE_URL set karo

Project root (jahan `package.json` hai) pe `.env` file banao ya update karo:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Neon wala connection string yahan paste karo.  
**Note:** `.env` git mein commit mat karo (already `.gitignore` mein hona chahiye).

---

## 3. Schema push karo (saari tables create)

Terminal mein project root pe:

```bash
npm run db:push
```

Ye command **Drizzle** se `shared/schema.ts` ke hisaab se Neon DB mein saari tables bana degi.  
Pehli baar run karte waqt pucha to **“Yes”** choose karo.

---

## 4. Extra column (agar purani DB se migrate kar rahe ho)

Agar tum **pehle se** kisi DB se data migrate kar rahe ho aur `task_categories` table pe `fixed_task_slugs` column nahi hai, to ye SQL Neon pe run karo (Neon SQL Editor ya pgAdmin se):

```sql
ALTER TABLE task_categories
ADD COLUMN IF NOT EXISTS fixed_task_slugs text[] DEFAULT '{}';
```

**Naya Neon project** se start kar rahe ho to `db:push` step 3 mein ye column bana dega — step 4 skip kar sakte ho.

---

## 5. (Optional) Seed data

Agar project mein seed script hai aur tum default data chahate ho:

```bash
npx tsx server/seed.ts
```

(Seed script maujood ho to hi run karo.)

---

## 6. Render pe deploy karte waqt

- Render pe **Backend** service ke **Environment** mein ye variable add karo:  
  **Key:** `DATABASE_URL`  
  **Value:** Neon wala hi connection string (step 1 wala).
- Redeploy karo. Ab backend Neon DB use karega.

---

## 7. pgAdmin se Neon connect karna

1. pgAdmin open karo → **Create New Server**.
2. **Connection** tab:
   - **Host:** Neon connection string se (e.g. `ep-xxx.region.aws.neon.tech`)
   - **Port:** 5432
   - **Database:** connection string wala database name
   - **Username / Password:** Neon string se
3. **SSL** tab: **SSL mode** = `Require`.
4. Save karo. Ab tum pgAdmin se Neon DB manage kar sakte ho.

---

## Agar `ENOTFOUND` / DNS error aaye

**Error:** `getaddrinfo ENOTFOUND ep-xxx-pooler....neon.tech`  
**Matlab:** Tumhare network/DNS se Neon ka host resolve nahi ho raha (India mein kuch ISPs/restrictions ki wajah se ho sakta hai).

**Try karo (order mein):**

1. **Direct connection use karo (Pooler ki jagah)**  
   Neon Dashboard → Project → **Connection details** → **Direct** connection string choose karo (Pooled nahi).  
   Host kuch aisa hoga: `ep-xxx-xxx.region.aws.neon.tech` (bina `-pooler` ke).  
   Is string ko `.env` mein `DATABASE_URL` banao aur phir `npm run db:push` chalao.

2. **DNS check karo**  
   PowerShell mein:  
   `nslookup ep-late-glade-ai6md9xr-pooler.c-4.us-east-1.aws.neon.tech`  
   Agar "can't find" aaye to DNS issue hai.

3. **DNS change karo**  
   Windows: Settings → Network → Ethernet/Wi‑Fi → Edit (DNS) → Manual → Preferred: `8.8.8.8`, Alternate: `1.1.1.1`.  
   Save karke PC restart karo, phir `npm run db:push` dobara chalao.

4. **VPN use karo**  
   Agar Neon tumhare region/ISP se block ya restrict ho, to VPN on karke same command chalao.

5. **Neon project / branch confirm karo**  
   Dashboard mein dekh lo project/branch exist karta hai aur connection string sahi copy kiya hai (password mein special chars encoded hon).

---

## Supabase se Neon mein table data kaise layen (migration)

Neon pe tables already bana chuke ho (`db:push`). Ab sirf **data** Supabase se copy karna hai.

### Option A: pg_dump + psql (recommended, agar PostgreSQL installed ho)

1. **Supabase connection string lo**  
   Supabase Dashboard → **Project Settings** → **Database** → **Connection string** (URI). Copy karo.  
   *(India mein Supabase block ho to VPN on karke dashboard open karo.)*

2. **Data export (Supabase se)**  
   Terminal mein (PowerShell / CMD):
   ```bash
   pg_dump "SUPABASE_CONNECTION_STRING" --data-only --no-owner --no-acl -f supabase_data.sql
   ```
   `SUPABASE_CONNECTION_STRING` ki jagah apna Supabase URL paste karo (quotes ke andar).

3. **Data import (Neon mein)**  
   Pehle ek file banao `import_with_fk_off.sql`:
   ```sql
   SET session_replication_role = 'replica';
   \i supabase_data.sql
   SET session_replication_role = 'origin';
   ```
   Phir:
   ```bash
   psql "NEON_DATABASE_URL" -f import_with_fk_off.sql
   ```
   `NEON_DATABASE_URL` = Neon wala connection string (Direct ya Pooled dono chalega).

**Note:** Windows pe `pg_dump` / `psql` ke liye PostgreSQL install karna padta hai (https://www.postgresql.org/download/windows/), ya WSL/Docker use karo.

---

### Option B: Node script (PostgreSQL install ki zarurat nahi)

Agar tumhe `pg_dump` / `psql` nahi mil rahe, to project mein script use karo jo **Supabase se read karke Neon mein insert** karegi.

1. **`.env` mein Supabase URL add karo** (Neon wala `DATABASE_URL` pehle se hai):
   ```env
   DATABASE_URL=postgresql://...   # Neon (jaisa pehle se)
   SUPABASE_URL=postgresql://...   # Supabase (migration ke liye)
   ```
   Supabase URL: Dashboard → Project Settings → Database → Connection string (URI).

2. **Migration script chalao** (project root se):
   ```bash
   npx tsx server/migrate-supabase-to-neon.ts
   ```
   Ye script Supabase ki saari public tables ka data Neon mein copy karegi. Pehle Neon pe `npm run db:push` chala chuke ho, isliye tables maujood honi chahiye.

*(Script ka code `server/migrate-supabase-to-neon.ts` mein hai.)*

---

## Short checklist

- [ ] Neon project banao, connection string copy karo
- [ ] `.env` mein `DATABASE_URL` set karo
- [ ] `npm run db:push` chalao
- [ ] (Zarurat ho to) `fixed_task_slugs` wala SQL run karo
- [ ] (Optional) `npx tsx server/seed.ts` chalao
- [ ] Render pe `DATABASE_URL` env var set karo
- [ ] pgAdmin mein Neon server add karo (optional)

Iske baad project ka **sara database** Neon pe setup ho chuka hoga.
