# Despliegue en QA (servidor compartido con Compras)

Este documento refleja cómo quedó desplegada la app en el servidor de QA
(`100.75.141.110`), que ya tenía corriendo otra app (**Compras**, backend
Node en `/var/www/compras-qa/ComprasBackend`, puerto 3001, con su propio
PostgreSQL). El objetivo fue subir esta app sin tocar nada de lo existente.

Se descartó el approach original con Docker (ver historial) porque, al
revisar el servidor real, no hacía falta: ya tiene Node 20.20.2 instalado a
nivel de sistema (justo la versión que esta app necesita) y PM2 ya está en
uso. Meter Docker habría sido una capa adicional innecesaria en un servidor
que no lo usa para nada más.

## Aislamiento logrado

- **Proceso**: corre como el usuario `iibcomprasqa` bajo su propio PM2, en
  `~/gestion-desempeno-qa`. Compras corre como `root` en `/var/www/`, proceso
  totalmente aparte.
- **Puerto**: `3000` (confirmado libre — Compras usa el 3001).
- **Base de datos**: mismo servidor PostgreSQL 16 que ya usa Compras, pero en
  una base de datos y un rol propios y separados:
  - Rol: `gestion_desempeno`
  - Base de datos: `gestion_desempeno` (Compras usa `compras_db_qa`, dueño
    `compras_app_qa` — no se tocó)
- **`.env`**: generado directo en el servidor con secretos nuevos (nunca se
  subió el `.env` de desarrollo local). Permisos `600`.

## Cómo se hizo (para repetirlo o actualizarlo)

```bash
# 1. Base de datos — solo la primera vez
sudo -u postgres psql -c "CREATE ROLE gestion_desempeno WITH LOGIN PASSWORD '<password>';"
sudo -u postgres psql -c "CREATE DATABASE gestion_desempeno OWNER gestion_desempeno;"

# 2. Código
mkdir -p ~/gestion-desempeno-qa
# copiar el repo ahí (excluyendo node_modules, .next, .env, .env.local)

# 3. .env — ver plantilla en .env.example. Puntos clave para este servidor:
#    DATABASE_URL="postgresql://gestion_desempeno:<password>@localhost:5432/gestion_desempeno?schema=public"
#    AUTH_URL="http://100.75.141.110:3000"
#    AUTH_SECRET=<generar nuevo, nunca reusar el de otro entorno>
chmod 600 ~/gestion-desempeno-qa/.env

# 4. Dependencias y build
cd ~/gestion-desempeno-qa
npm install   # package-lock.json no estaba 100% en sync; `npm ci` fallaba
npx prisma generate
npx prisma migrate deploy
npx prisma db execute --file prisma/constraints.sql --schema prisma/schema.prisma
npm run build

# 5. Arrancar con PM2 (aislado del PM2/systemd de Compras, mismo usuario)
PORT=3000 pm2 start npm --name gestion-desempeno-qa -- run start
pm2 save
```

## SSO (Microsoft Entra ID) — resuelto con HTTPS vía nginx

El servidor no tiene dominio, solo IP. Microsoft Entra ID **rechaza en el
propio portal** cualquier redirect URI `http://` que no sea `localhost` (no
deja ni guardarlo), así que hizo falta HTTPS real frente a la app:

- nginx (el mismo que ya usa Compras) tiene un **sitio nuevo y separado**,
  `/etc/nginx/sites-available/gestion-desempeno-qa`, escuchando en el puerto
  **8443** con un certificado autofirmado
  (`/etc/nginx/ssl/gestion-desempeno.{crt,key}`), que hace proxy a la app en
  `127.0.0.1:3000`.
- La app se accede en **`https://100.75.141.110:8443`** (el navegador muestra
  advertencia de certificado — normal con autofirmado, se acepta y ya).
- `AUTH_URL` en `.env` está en `https://100.75.141.110:8443` (no en el puerto
  3000 directo).
- El redirect URI registrado en el App Registration de Azure es:
  `https://100.75.141.110:8443/api/auth/callback/microsoft-entra-id`

Dos detalles de la config de nginx que costó descubrir y que hay que
mantener si se toca este archivo:
- `proxy_set_header Host $http_host;` (no `$host`) — si se usa `$host` se
  pierde el puerto y Next.js rechaza las Server Actions por mismatch entre
  `x-forwarded-host` y `origin`.
- `proxy_buffer_size 16k; proxy_buffers 4 16k; proxy_busy_buffers_size 32k;`
  — los buffers por defecto de nginx son muy chicos para las cookies de
  sesión de Auth.js y causaban `502 Bad Gateway` ("upstream sent too big
  header") justo en el callback de login.

Verificar cambios a esta config sin arriesgar nada:
```bash
sudo nginx -t                        # valida sintaxis antes de aplicar
sudo systemctl reload nginx          # reload, no restart — no tumba conexiones
```

## Estructura organizacional: sincronización automática con Entra ID

La estructura (gerencias, colaboradores, jefes, cargos) se mantiene al día
sola, sin intervención manual, corriendo
`scripts/migracion-sharepoint/sincronizar-grupo.mjs` por cron cada 6 horas
bajo el usuario `iibcomprasqa`:

```
0 */6 * * * cd /home/iibcomprasqa/gestion-desempeno-qa && /usr/bin/node --env-file=.env scripts/migracion-sharepoint/sincronizar-grupo.mjs >> /home/iibcomprasqa/gestion-desempeno-qa/sync-directorio.log 2>&1
```

(servidor en UTC → corre ~7am, 1pm, 7pm, 1am hora Colombia). Ver/editar con
`crontab -l` / `crontab -e` como ese mismo usuario.

Cada corrida, contra el grupo real de Entra ID "Usuarios_activos":
- **Crea** en el sistema a quien esté en el grupo y no exista todavía.
- **Actualiza** cargo, nombre, gerencia (por `department`) y activo/inactivo
  de quien ya existía, si cambiaron en Entra ID — así que si cambian el
  cargo o el jefe de alguien allá, se refleja acá solo, sin tocar nada.
- **Actualiza el jefe** de todos (no solo de los nuevos) según el `manager`
  real en Entra ID.
- **Desactiva** a quien ya no esté en el grupo (excepto la cuenta de
  arranque `iibservices2@investinbogota.org`).
- **Trae/actualiza la foto de perfil** de cada quien (la misma de Teams/
  Outlook) y la guarda en la base (columna `foto`, bytes). Se sirve por
  `/api/foto/[usuarioId]`, protegida por el mismo middleware de sesión que el
  resto de la app. Quien no tenga foto en Entra ID simplemente no la tiene
  acá tampoco — la UI cae a mostrar iniciales automáticamente
  (`src/components/Avatar.tsx`).

Las 6 gerencias reales (con su gerente formal) se crearon una sola vez a
mano — el script de sincronización asigna colaboradores a gerencias
existentes por nombre, pero no crea gerencias nuevas ni asigna quién es el
gerente formal de cada una.

Revisar la última corrida: `tail -50 ~/gestion-desempeno-qa/sync-directorio.log`

Correrla a mano en cualquier momento:
```bash
cd ~/gestion-desempeno-qa && node --env-file=.env scripts/migracion-sharepoint/sincronizar-grupo.mjs
```

## Verificar que Compras sigue sano después de cualquier cambio

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/
ss -tln | grep -E ':3000|:3001|:5432'
pm2 list   # solo debe listar procesos de este usuario (gestion-desempeno-qa)
```

## Actualizar a una versión nueva

```bash
cd ~/gestion-desempeno-qa
# reemplazar el código (sin tocar .env)
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart gestion-desempeno-qa
```

## Apagar (sin afectar Compras)

```bash
pm2 stop gestion-desempeno-qa      # o `pm2 delete gestion-desempeno-qa`
```

Compras corre como `root` en un proceso totalmente distinto — nada de esto lo
toca.
