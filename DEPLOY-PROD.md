# Manual de despliegue en PRODUCCIÓN (servidor compartido con Compras y Contratación)

Este manual lleva la app de Gestión del Desempeño a producción **en un servidor
que ya sirve a otras apps** (Compras y Contratación). La regla que manda todo
lo demás: **esta app solo puede crear y tocar recursos propios** (usuario,
carpeta, puerto, base de datos, proceso, sitio de nginx). Nada de lo existente
se modifica.

Se apoya en lo que ya funciona en QA (`DEPLOY-QA.md`) y en una revisión de solo
lectura del servidor de QA hecha el 2026-10-21. Lo que **no** pude verificar
(porque no tengo acceso al servidor de producción) está marcado como
**[VERIFICAR]**.

---

## 0. Antes de empezar: datos y permisos que hay que tener

| # | Qué | Por qué |
|---|-----|---------|
| 1 | IP o dominio de producción y puerto público | Define nginx, `AUTH_URL` y el redirect de Entra ID |
| 2 | Alguien con `sudo` en el servidor | Crear usuario, base de datos, sitio nginx, regla de firewall y arranque de PM2 |
| 3 | Un nombre de dominio (ej. `desempeno.investinbogota.org`) **o** aceptar un puerto propio con IP | Con dominio se usa el 443 normal; con solo IP hay que abrir un puerto extra |
| 4 | Certificado TLS: de la CA corporativa / Let's Encrypt (con dominio) o autofirmado (solo IP) | Microsoft Entra ID **exige HTTPS** en el redirect; el autofirmado funciona pero el navegador avisa |
| 5 | Permiso para editar el App Registration de Entra ID (o crear uno nuevo para prod) | Registrar el redirect de producción |
| 6 | El Excel de SharePoint con los objetivos históricos (opcional) | Solo si se va a importar el histórico con `importar-estructura-real.mjs` |
| 7 | Dónde guardar copias de seguridad fuera del servidor | Un backup en el mismo disco no sirve ante un fallo del servidor |

Requisito de software: **Node 20.x** (el servidor de QA tiene 20.20.2). No usar
Node 24: el `.gitignore` del proyecto menciona un bug de WebCrypto/Auth.js con
esa versión, por el que el desarrollo local usa un Node 20 portable.

---

## 1. Qué hay en el servidor (verificado en QA el 2026-10-21)

Si producción es el mismo equipo que QA, esto ya es así. Si es otro, repite el
inventario de la sección 3.1.

| Recurso | Estado en QA | Implicación para prod |
|---------|--------------|-----------------------|
| Puertos `80` y `443` | nginx, sitio **Compras** (`/etc/nginx/sites-enabled/compras`) | No se pueden "tomar"; con dominio se comparte el 443 por `server_name` |
| Puerto `8443` | nginx → esta app (QA) | Producción necesita **otro** puerto o un dominio |
| Puertos `3000` / `3001` | `3000` esta app (QA), `3001` backend de Compras | Usar otro puerto interno para prod (ej. `3010`) |
| PostgreSQL 16 | Un solo clúster, compartido | Base y rol propios para prod, separados de QA y de Compras |
| PM2 | Compras: `pm2-root.service` (usuario root). Esta app: PM2 del usuario `iibcomprasqa` | Prod con su **propio** usuario y su propio PM2 |
| Firewall (ufw) | Abiertos: 22, 80, 443, 8443, **5432** | Un puerto público nuevo requiere `ufw allow` |
| Recursos | 4 vCPU, 16 GB RAM, ~181 GB libres | Sobra para `next build`; usar `nice` para no afectar a Compras |
| Zona horaria | UTC | Los cron corren a hora UTC (Colombia = UTC-5) |

### Riesgos que encontré (no los cambié; conviene resolverlos)

1. **PostgreSQL escucha en `0.0.0.0:5432` y ufw permite el 5432 desde cualquier
   lugar.** La base queda expuesta a internet protegida solo por contraseña. Si
   nada externo necesita conectarse, restringir a `localhost`
   (`listen_addresses` en `postgresql.conf` + quitar la regla de ufw), **después
   de confirmar con el equipo de Compras que su app se conecta por localhost**.
2. **La app de QA no arranca sola tras un reinicio del servidor**: en systemd
   solo vi `pm2-root.service`, ningún servicio de PM2 para `iibcomprasqa`. En
   prod esto se resuelve en la sección 8 (`pm2 startup`).
3. **Las apps Node escuchan en todas las interfaces** (`*:3000`, `*:3001`). Hoy
   el firewall las tapa, pero la defensa debe ser doble: en prod la app se
   arranca ligada a `127.0.0.1` (sección 8) y solo nginx la expone.

---

## 2. Diseño de producción

Valores recomendados; ajusta los que choquen con lo que encuentres en el
inventario.

| Variable | Valor recomendado | Nota |
|----------|-------------------|------|
| `APP_USER` | `iibdesempeno` | Usuario Linux dedicado, **no** reutilizar `iibcomprasqa` ni `root` |
| `APP_DIR` | `/home/iibdesempeno/gestion-desempeno-prod` | |
| `APP_PORT` | `3010` | Interno, solo `127.0.0.1` |
| `DB_NAME` / `DB_USER` | `gestion_desempeno_prod` | Separados de QA (`gestion_desempeno`) |
| `PM2_NAME` | `gestion-desempeno-prod` | |
| `HOST` | `desempeno.investinbogota.org` **o** `<IP_PROD>:9443` | Lo que el usuario escribe en el navegador |
| nginx | sitio nuevo `/etc/nginx/sites-available/gestion-desempeno-prod` | No tocar `compras*` |

Estructura en disco (permite volver atrás en segundos):

```
~/gestion-desempeno-prod/
  incoming/        # tarballs subidos por scp
  releases/        # una carpeta por versión (código + node_modules + .next)
  shared/.env      # secretos, permisos 600, NO está en el repo
  current -> releases/<versión activa>
  backups/         # volcados de la base
```

---

## 3. Primera instalación

### 3.1 Inventario previo (solo lectura)

Haz esto primero, sobre todo si producción es un servidor distinto a QA. Anota
qué puertos y sitios están ocupados **antes** de elegir los tuyos.

```bash
ss -tln                                   # puertos en uso
ls -la /etc/nginx/sites-enabled/          # sitios nginx existentes
pm2 list; systemctl list-units --type=service --no-pager | grep -iE "pm2|node|nginx|postgres"
ps -eo user,pid,args | grep -E "node|next" | grep -v grep
sudo ufw status
free -m; df -h /
node -v                                   # debe ser 20.x
```

Si Contratación es una app distinta a Compras, identifícala aquí (su puerto, su
sitio nginx, su base) para no pisarla. En QA solo vi Compras.

### 3.2 Usuario Linux (requiere sudo)

```bash
sudo adduser --disabled-password --gecos "" iibdesempeno
sudo mkdir -p /home/iibdesempeno/.ssh
# autorizar la llave de despliegue (la pública, .pub)
echo "<CONTENIDO_DE_LA_LLAVE_PUBLICA>" | sudo tee /home/iibdesempeno/.ssh/authorized_keys
sudo chown -R iibdesempeno:iibdesempeno /home/iibdesempeno/.ssh
sudo chmod 700 /home/iibdesempeno/.ssh && sudo chmod 600 /home/iibdesempeno/.ssh/authorized_keys
sudo npm install -g pm2          # solo si PM2 no está instalado globalmente
```

### 3.3 Base de datos propia (requiere sudo)

La contraseña en **hexadecimal** evita caracteres que romperían la
`DATABASE_URL`.

```bash
DBPASS=$(openssl rand -hex 24); echo "$DBPASS"      # guárdala en el gestor de secretos
sudo -u postgres psql -c "CREATE ROLE gestion_desempeno_prod WITH LOGIN PASSWORD '$DBPASS';"
sudo -u postgres psql -c "CREATE DATABASE gestion_desempeno_prod OWNER gestion_desempeno_prod;"
```

No se otorga ningún permiso sobre las bases de Compras.

### 3.4 Microsoft Entra ID

1. En el App Registration (mejor uno **propio de producción**, con su propio
   client secret), agregar el redirect URI tipo Web:
   `https://<HOST>/api/auth/callback/microsoft-entra-id`
2. Single-tenant. En *Enterprise applications → Properties*:
   **Assignment required = Yes**, y asignar el grupo `Usuarios_activos`.
3. Permisos de **Application** de Microsoft Graph, con consentimiento de
   administrador: `User.Read.All` y `GroupMember.Read.All` (los usa el script
   de sincronización).
4. Anotar la **fecha de vencimiento del client secret** y poner un recordatorio
   antes: cuando vence, el login SSO deja de funcionar de golpe.

### 3.5 Subir el código

Desde tu equipo (Git Bash), con el repo **sin cambios pendientes** y subido a
GitHub:

```bash
git status                                  # debe decir "nothing to commit"
git tag prod-2026-10-21
git push origin master --tags
git archive --format=tar.gz -o prod-2026-10-21.tar.gz prod-2026-10-21
ssh <APP_USER>@<IP> 'mkdir -p ~/gestion-desempeno-prod/{incoming,releases,shared,backups}'
scp prod-2026-10-21.tar.gz <APP_USER>@<IP>:gestion-desempeno-prod/incoming/
```

`git archive` solo empaqueta lo versionado: nunca viaja `.env`, `db_local`,
`node_modules` ni `.next`.

### 3.6 `.env` de producción

En el servidor, como `iibdesempeno`. Nunca reutilizar el `.env` de desarrollo ni
el de QA.

```bash
umask 077
cat > ~/gestion-desempeno-prod/shared/.env <<'EOF'
DATABASE_URL="postgresql://gestion_desempeno_prod:<DBPASS>@127.0.0.1:5432/gestion_desempeno_prod?schema=public"
AUTH_SECRET="<resultado de: openssl rand -base64 32>"
AUTH_URL="https://<HOST>"
AUTH_MICROSOFT_ENTRA_ID_ID="<client id de prod>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<client secret de prod>"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<TENANT_ID>/v2.0"
EOF
chmod 600 ~/gestion-desempeno-prod/shared/.env
```

- `AUTH_URL` va **sin barra final** y **con el puerto** si no es el 443.
- No hacen falta las variables `SMTP_*`, `GRAPH_*` ni `SHAREPOINT_*` del
  `.env.example`: el código actual no las usa.

### 3.7 Instalar, migrar y compilar

```bash
REL=2026-10-21
cd ~/gestion-desempeno-prod
mkdir -p releases/$REL && tar -xzf incoming/prod-$REL.tar.gz -C releases/$REL
cd releases/$REL
ln -s ~/gestion-desempeno-prod/shared/.env .env

npm ci                       # si falla por package-lock desincronizado: npm install y avisar
npx prisma generate
npx prisma migrate deploy    # NUNCA "migrate dev" ni "migrate reset" en producción
npx prisma db execute --file prisma/constraints.sql --schema prisma/schema.prisma   # SOLO la primera vez
nice -n 10 npm run build
```

`constraints.sql` usa `ADD CONSTRAINT` sin `IF NOT EXISTS`: si se corre dos
veces, falla. Es solo de la primera instalación.

### 3.8 Datos iniciales (solo la primera vez)

```bash
npx prisma db seed
```

El seed crea la cuenta de arranque `iibservices2@investinbogota.org`
(Gestión Humana + Admin) y el periodo `2026` con 4 seguimientos con franja y la franja del %
de cumplimiento. No crea indicadores de la empresa: los carga el Gestor corporativo desde la
pestaña Indicadores. Para eso, la persona encargada debe tener el rol *Gestor de objetivos
corporativos* (Administración → Estructura organizacional).

**No volver a correr el seed en producción.** Sus `upsert` restauran valores:
reabrirían el periodo 2026 aunque ya esté cerrado, devolverían los seguimientos a sus
fechas originales y repondrían los roles de la cuenta de arranque.

Después, cargar la estructura organizacional:

- **Con el Excel de SharePoint** (crea las 6 gerencias, asigna gerentes, trae
  usuarios de Entra ID e importa objetivos individuales históricos):
  ```bash
  node --env-file=.env scripts/migracion-sharepoint/importar-estructura-real.mjs <ruta.xlsx>
  ```
- **Sin Excel**: crear las gerencias y asignar gerentes a mano desde
  *Administración → Estructura organizacional*.

Y siempre, para traer a todo el grupo `Usuarios_activos`:

```bash
node --env-file=.env scripts/migracion-sharepoint/sincronizar-grupo.mjs
```

---

## 4. Arranque con PM2 (aislado y con persistencia)

```bash
ln -sfn ~/gestion-desempeno-prod/releases/2026-10-21 ~/gestion-desempeno-prod/current
cd ~/gestion-desempeno-prod/current
PORT=3010 pm2 start npm --name gestion-desempeno-prod -- run start -- -H 127.0.0.1
pm2 save
ss -tln | grep 3010        # debe decir 127.0.0.1:3010, NO *:3010   [VERIFICAR: no probado aún con -H]
```

Que sobreviva a un reinicio del servidor (requiere sudo, una sola vez):

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u iibdesempeno --hp /home/iibdesempeno
pm2 save
```

Reglas de convivencia con Compras (que corre bajo el PM2 de **root**):

- Nunca ejecutar `pm2 kill` ni `pm2 delete all` como root.
- Como `iibdesempeno` esos comandos solo afectan a esta app, pero igual
  evítalos: usa siempre el nombre `gestion-desempeno-prod`.

---

## 5. nginx, TLS y firewall (requiere sudo)

Se crea un sitio **nuevo**; los de Compras no se editan.

### Opción A: con dominio (recomendada)

Comparte el puerto 443 con Compras gracias a `server_name` (SNI). Obtén el
certificado (corporativo o `certbot --nginx -d desempeno.investinbogota.org`) y:

```nginx
# /etc/nginx/sites-available/gestion-desempeno-prod
server {
    listen 443 ssl http2;
    server_name desempeno.investinbogota.org;

    ssl_certificate     /etc/nginx/ssl/desempeno.crt;
    ssl_certificate_key /etc/nginx/ssl/desempeno.key;

    include /etc/nginx/snippets/gestion-desempeno-proxy.conf;
}
```

### Opción B: solo IP, puerto propio

Igual, pero `listen 9443 ssl http2;`, `server_name <IP_PROD>;` y un certificado
autofirmado:

```bash
sudo openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/gestion-desempeno-prod.key \
  -out /etc/nginx/ssl/gestion-desempeno-prod.crt -subj "/CN=<IP_PROD>"
sudo chmod 600 /etc/nginx/ssl/gestion-desempeno-prod.key
sudo ufw allow 9443/tcp
```

### Bloque proxy (igual al de QA)

Los tres detalles marcados costaron días en QA; **no los cambies**:

```nginx
# /etc/nginx/snippets/gestion-desempeno-proxy.conf
location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_buffer_size 16k;                 # buffers chicos => 502 "too big header" en el login
    proxy_buffers 4 16k;
    proxy_busy_buffers_size 32k;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;      # NO $host: pierde el puerto y Next rechaza las Server Actions
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Activar **sin riesgo para Compras**: validar antes y usar `reload`, nunca
`restart`.

```bash
sudo ln -s /etc/nginx/sites-available/gestion-desempeno-prod /etc/nginx/sites-enabled/
sudo nginx -t                    # si falla, NO sigas: nginx sirve también a Compras
sudo systemctl reload nginx
```

---

## 6. Tareas programadas y copias de seguridad

Como `iibdesempeno` (`crontab -e`). El servidor está en UTC.

```cron
# Sincronizar estructura con Entra ID cada 6 h (~7am, 1pm, 7pm, 1am Colombia)
0 */6 * * * cd /home/iibdesempeno/gestion-desempeno-prod/current && /usr/bin/node --env-file=.env scripts/migracion-sharepoint/sincronizar-grupo.mjs >> /home/iibdesempeno/gestion-desempeno-prod/sync-directorio.log 2>&1

# Backup diario de la base a las 02:00 UTC (21:00 Colombia)
0 2 * * * /home/iibdesempeno/gestion-desempeno-prod/backup-db.sh >> /home/iibdesempeno/gestion-desempeno-prod/backup.log 2>&1
```

Credenciales de `pg_dump` sin escribir la contraseña en el script:

```bash
echo "127.0.0.1:5432:gestion_desempeno_prod:gestion_desempeno_prod:<DBPASS>" > ~/.pgpass
chmod 600 ~/.pgpass
```

```bash
#!/usr/bin/env bash
# ~/gestion-desempeno-prod/backup-db.sh   (chmod 700)
set -euo pipefail
DEST=/home/iibdesempeno/gestion-desempeno-prod/backups
STAMP=$(date -u +%Y%m%d_%H%M%S)
pg_dump -h 127.0.0.1 -U gestion_desempeno_prod -Fc gestion_desempeno_prod \
  -f "$DEST/gestion_desempeno_prod_$STAMP.dump"
find "$DEST" -name '*.dump' -mtime +14 -delete      # conserva 14 días
```

- **Copia fuera del servidor** (punto 7 de la sección 0): sin eso, el backup no
  cubre la pérdida del servidor.
- **Prueba de restauración** (hazla al menos una vez, en una base temporal):
  `pg_restore -h 127.0.0.1 -U <rol> -d <base_temporal> --no-owner <archivo.dump>`
- La sincronización **desactiva** a quien salga del grupo `Usuarios_activos`
  (salvo la cuenta de arranque). Si alguien desaparece de la app, revisar
  primero el grupo en Entra ID.

---

## 7. Verificación después del despliegue

### La app

```bash
pm2 list                                                   # gestion-desempeno-prod: online
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/login     # 200
curl -sk -o /dev/null -w '%{http_code}\n' https://<HOST>/login           # 200
pm2 logs gestion-desempeno-prod --lines 30 --nostream      # sin errores
```

En el navegador:

1. `/login` muestra solo "Iniciar sesión con Microsoft". **No debe aparecer la
   sección "Solo desarrollo — sin Microsoft"**: si aparece, el proceso no está
   corriendo con `NODE_ENV=production` y hay que corregirlo antes de abrirla a
   usuarios.
2. Entrar con una cuenta real por SSO y llegar a "Mis objetivos".
3. Con la cuenta de arranque: *Administración* y *Estructura organizacional*
   cargan, y el conteo de colaboradores coincide con el grupo de Entra ID.
4. Se ven las fotos/iniciales de los colaboradores.

### Que Compras y Contratación siguen sanos

```bash
curl -s -o /dev/null -w 'compras api: %{http_code}\n' http://127.0.0.1:3001/
ss -tln | grep -E ':80 |:443 |:3001|:5432'
sudo nginx -t
```

Abre además, desde un navegador, las URLs de Compras y Contratación y confirma
que cargan igual que antes.

---

## 8. Actualizar a una versión nueva

Cada versión va en su propia carpeta, así el rollback es inmediato.

```bash
# 1) En tu equipo: repo limpio, probado (npx tsc --noEmit && npx vitest run && npm run build)
git tag prod-2026-11-04 && git push origin master --tags
git archive --format=tar.gz -o prod-2026-11-04.tar.gz prod-2026-11-04
scp prod-2026-11-04.tar.gz <APP_USER>@<IP>:gestion-desempeno-prod/incoming/

# 2) En el servidor
REL=2026-11-04
cd ~/gestion-desempeno-prod
~/gestion-desempeno-prod/backup-db.sh                     # backup ANTES de migrar
mkdir -p releases/$REL && tar -xzf incoming/prod-$REL.tar.gz -C releases/$REL
cd releases/$REL && ln -s ~/gestion-desempeno-prod/shared/.env .env
npm ci && npx prisma generate
npx prisma migrate deploy
nice -n 10 npm run build

# 3) Cambiar de versión (unos segundos de corte)
ln -sfn ~/gestion-desempeno-prod/releases/$REL ~/gestion-desempeno-prod/current
pm2 delete gestion-desempeno-prod
cd ~/gestion-desempeno-prod/current
PORT=3010 pm2 start npm --name gestion-desempeno-prod -- run start -- -H 127.0.0.1
pm2 save
```

Luego repite la sección 7. **No** vuelvas a correr `db seed` ni `constraints.sql`.

Como la migración corre mientras la versión anterior sigue sirviendo, las
migraciones deben ser compatibles hacia atrás (agregar columnas, no borrar ni
renombrar en el mismo release).

### Rollback

```bash
ln -sfn ~/gestion-desempeno-prod/releases/<VERSION_ANTERIOR> ~/gestion-desempeno-prod/current
pm2 delete gestion-desempeno-prod
cd ~/gestion-desempeno-prod/current && PORT=3010 pm2 start npm --name gestion-desempeno-prod -- run start -- -H 127.0.0.1
pm2 save
```

Eso revierte el código. **Las migraciones de base de datos no se revierten
solas**: si el release cambió el esquema de forma incompatible, restaura el
backup tomado antes de migrar (`pg_restore`). Conserva las 3 últimas carpetas de
`releases/` y borra las anteriores.

---

## 9. Problemas conocidos

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `502 Bad Gateway` justo en el callback del login | Buffers de nginx chicos para las cookies de Auth.js ("upstream sent too big header") | Mantener `proxy_buffer_size 16k; proxy_buffers 4 16k; proxy_busy_buffers_size 32k;` |
| Las acciones (botones) fallan con error de origen / host | `proxy_set_header Host $host` pierde el puerto | Usar `$http_host` |
| "Iniciar sesión con Microsoft" no hace nada; `fetch failed` / `ECONNRESET` en el log | Red con inspección TLS que rompe TLS 1.3 de Node | Ya mitigado: el script `start` fuerza `--tls-max-v1.2`; no lo quites |
| `redirect_uri_mismatch` de Microsoft | `AUTH_URL` o el redirect de Entra ID no coinciden exactamente (https, puerto, sin barra final) | Alinear los dos |
| El login dejó de funcionar sin tocar nada | Venció el client secret de Entra ID | Crear un secret nuevo, actualizar `shared/.env`, `pm2 restart` |
| Aparece o desaparece gente en *Estructura organizacional* | Es el resultado de `sincronizar-grupo.mjs` (la fuente de verdad es Entra ID) | Revisar el grupo `Usuarios_activos` y `sync-directorio.log` |
| Aviso `"next start" does not work with "output: standalone"` en el log | `next.config.mjs` tiene `output: "standalone"` (hecho para Docker) | Inofensivo (QA corre así hace semanas); ver pendientes |

---

## 10. Pendientes recomendados

1. Cerrar PostgreSQL a `localhost` y quitar el `5432` de ufw (riesgo 1 de la
   sección 1), coordinado con Compras.
2. Si no se va a usar Docker, quitar `output: "standalone"` de
   `next.config.mjs` (o servir con `node .next/standalone/server.js`) para
   eliminar el aviso del log.
3. Rotación de logs de PM2: `pm2 install pm2-logrotate`.
4. Enviar copias de `backups/` a otro equipo o almacenamiento.
5. Actualizar `DEPLOY-QA.md`: la app de QA responde en
   `https://160.153.183.204:8443`; el documento menciona `100.75.141.110`
   (probablemente la IP de Tailscale del mismo servidor, **[VERIFICAR]**).
6. Calendario con el vencimiento del client secret de Entra ID.
