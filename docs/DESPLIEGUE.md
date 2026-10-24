# Despliegue de Workly

Guía para poner Workly en un servidor propio dentro de la Unión Europea. El camino más simple es un VPS en la UE (por ejemplo Hetzner en Falkenstein o Helsinki, u OVH en Francia). No hace falta Kubernetes.

Esto no sustituye el alta fiscal ni la revisión de los textos legales. Esos pasos están al final y los tiene que hacer el titular.

## Qué vas a tener

- MySQL 8.4, la API en el puerto 3000 y la web en el puerto 8080 (nginx).
- Un chequeo de salud en `GET /api/health` (responde 200 si la base contesta y 503 si no).
- Registro en JSON cuando `NODE_ENV=production`.
- Un aviso opcional de errores si rellenas `ERROR_WEBHOOK_URL`.
- Copias diarias de MySQL, con borrado de las que pasen de 30 días.
- Migraciones numeradas en `backend/scripts/`.

## 1. El servidor

1. Contrata un VPS con Ubuntu 24.04 en un centro de datos de la UE. Con 2 GB de RAM basta para empezar.
2. Entra por SSH con una clave, no con contraseña de root abierta a internet.
3. Instala Docker y el plugin Compose desde la documentación oficial de Docker para Ubuntu.
4. Abre solo los puertos 22, 80 y 443. El puerto 3306 de MySQL no debe verse desde fuera: en este `docker-compose.yml` no se publica.
5. Apunta el dominio (un registro A) a la IP del VPS. El certificado HTTPS lo pone Caddy o el proxy que elijas en el paso 6.

## 2. Código y variables

En el servidor:

```bash
git clone https://github.com/alvaroosanchezz34/workly-tfg.git
cd workly-tfg
git checkout main
```

Copia los ejemplos y rellénalos. No subas estos ficheros al repositorio.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Genera secretos distintos y largos:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

En `backend/.env`, como mínimo:

- `NODE_ENV=production`
- `DB_HOST=mysql` (el nombre del servicio en Compose; no uses localhost)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` y `JWT_REFRESH_SECRET`, cada uno con 32 caracteres o más, distintos entre sí y distintos de los textos del ejemplo
- `FRONTEND_URL` con la URL pública, sin barra final (por ejemplo `https://workly.tudominio.es`)
- `VERIFACTU_PROVIDER=noop` hasta que el certificado y el productor estén listos
- `VERIFACTU_CERT_KEY` con los 32 bytes en base64

En la raíz, para Compose, exporta también `MYSQL_ROOT_PASSWORD` (distinta de la del usuario de la app) y `VITE_API_URL` (por ejemplo `https://workly.tudominio.es/api` si el proxy reenvía `/api` al contenedor, o la URL del API si va en otro dominio).

`VITE_API_URL` se mete en el JavaScript en el momento de construir la imagen. Si la cambias, hay que volver a construir el contenedor `web`.

La API no arranca en producción si los secretos JWT son cortos, son los del ejemplo, coinciden entre sí, o si `DB_PASSWORD` está vacío.

## 3. Primera base de datos

La primera vez, crea el esquema completo y marca las migraciones como ya aplicadas. Los ficheros `007` y `008` no se pueden ejecutar dos veces, y `CREATEDATABASE.sql` ya incluye esas tablas.

```bash
docker compose up -d mysql
# espera a que el healthcheck pase
docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/scripts/CREATEDATABASE.sql
docker compose run --rm api node scripts/migrate.js --mark-applied 009
```

A partir de ahí, cada versión nueva:

```bash
docker compose run --rm api node scripts/migrate.js
```

`--mark-applied 009` marca todos los ficheros cuyo número sea 009 o menor, sin ejecutarlos. Úsalo solo en una base que ya tiene esas tablas. En un servidor que ya estaba en marcha antes de esta versión y ya aplicó 002–008 a mano, marca hasta 008 y deja que el runner ejecute `009_production.sql`:

```bash
docker compose run --rm api node scripts/migrate.js --mark-applied 008
docker compose run --rm api node scripts/migrate.js
```

## 4. Arrancar

```bash
docker compose up -d --build
```

Comprueba:

```bash
curl -s http://127.0.0.1:3000/api/health
```

Tiene que decir `"status":"ok"` y `"db":"up"`.

## 5. HTTPS

No publiques la web solo por el puerto 8080. Pon un proxy en el mismo VPS. Caddy es el más corto: un fichero `Caddyfile` con el dominio y dos `reverse_proxy` (la web al `127.0.0.1:8080` y `/api` al `127.0.0.1:3000`). Caddy pide el certificado de Let's Encrypt solo.

El navegador llama a la API en otro origen si usas un subdominio distinto. Ese origen tiene que estar en `FRONTEND_URL` (y la API ya acepta `https://workly.space`). Las peticiones sin cabecera `Origin` se aceptan para que `curl` y el healthcheck funcionen.

## 6. Copias y restauración

El script es `backend/scripts/backup-mysql.sh`. Dentro del servidor, con el cliente `mysql` y `mysqldump` instalados (o ejecutándolo en un contenedor que los tenga):

```bash
chmod +x backend/scripts/backup-mysql.sh
export DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=... DB_PASSWORD=... DB_NAME=workly_db
export BACKUP_DIR=/var/backups/workly BACKUP_RETENTION_DAYS=30
./backend/scripts/backup-mysql.sh
```

Como MySQL no está publicado, desde el host puedes lanzar el volcado así:

```bash
docker compose exec -T mysql sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' | gzip -c > "/var/backups/workly/workly-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
```

Programa eso cada noche con cron, por ejemplo a las 03:15. Borra a mano los `.sql.gz` de más de 30 días si no usas el script (el script ya lo hace con `find`).

Copia los ficheros fuera del mismo disco (otro servidor o un cubo en la UE). Una copia que vive solo en el VPS se pierde con el disco.

Para restaurar, para la API y vuelca el fichero:

```bash
docker compose stop api
gunzip -c /var/backups/workly/workly-FECHA.sql.gz | docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
docker compose start api
```

Prueba la restauración una vez en un VPS vacío antes de dar el alta a clientes. Una copia que no se ha restaurado no cuenta.

## 7. Sesión, contraseñas y registros

- La contraseña se guarda con bcrypt, coste 12. El mínimo son 8 caracteres.
- El acceso dura 30 minutos (`JWT_EXPIRES_IN`). El refresco dura 7 días, se guarda solo su hash SHA-256 y se rota en cada refresco.
- Cerrar sesión revoca ese refresco en el servidor. Hay que aplicar la migración `009` para que exista la tabla `refresh_tokens`.
- El login, el registro, el refresco y el cierre de sesión están limitados a 20 peticiones por IP cada 15 minutos. La lista de espera pública, a 30.
- Los errores 500 no devuelven el texto de MySQL. Si defines `ERROR_WEBHOOK_URL`, se envía el mensaje y la ruta, sin la pila.
- El certificado electrónico del cliente viaja en JSON (base64), con un tope, y se comprueba que sea un PFX antes de cifrarlo. No hay subida de ficheros sueltos al disco.

## 8. Lo que el titular tiene que hacer él

1. Poner su nombre, NIF y domicilio reales en los borradores de `Aviso legal`, `Privacidad`, `Cookies`, `Términos` y `Contrato de encargado`. Están marcados como borrador en la web. Un asesor debe leerlos antes de cobrar.
2. Decidir el precio definitivo. Los textos `12–15 €/mes` y `9 €/mes` para los primeros 50 están en `PRICING`, al principio de `frontend/src/pages/Landing.jsx`.
3. No poner `VERIFACTU_PROVIDER=aeat` hasta tener el NIF del productor, la declaración responsable presentada y un certificado de prueba aceptado en preproducción. El modo por defecto `noop` no envía nada a la AEAT.
4. Si algún cliente va a facturar con el certificado de la plataforma, hace falta un apoderamiento inscrito en la AEAT. Con el certificado propio del autónomo no hace falta.
5. Conservar las facturas emitidas y los registros VeriFactu al menos 4 años. La baja de una cuenta anonimiza el acceso y borra el certificado guardado, pero no borra esas facturas. No las borres a mano de MySQL.
6. Revisar `npm audit` de vez en cuando. No apliques `npm audit fix --force` sin mirar: puede subir de versión mayor y romper la API.
