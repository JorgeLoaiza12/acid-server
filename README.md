Proyecto creado con Express.

El siguiente proyecto para su correcto funcionamiento se debe crear una copia del archivo `.example.env` que se encuentra en el directorio raiz del proyecto y renombrarlo a `.env`. Dentro se deben completar las variables de entorno:

```
# Puerto en el cual se ejecutara el servidor
PORT=3000

# ApiKey de DarkSky
DARKSKY_KEY=
# ApiKey de Google Maps
GOOGLE_MAPS_KEY=

# Host y puerto para el Redis
REDIS_HOST='redis'
REDIS_PORT=6379

```
 
## Comandos disponibles

Para iniciar el proyecto se debe ejecutar el siguiente comando en el directorio raíz:

### `npm start`

Este se abrirá en modo de desarrollo.<br> [http://localhost:3000](http://localhost:3000)

### Despliegue a produccion con Docker

En la raíz del proyecto se debe ejecutar el siguiente comando:

### `docker-compose  up -d`

Este comando se encargara de ejecutar el  archivo de configuración `docker-compose.yml` el cual creara un contenedor para el servidor y otro para la base de datos de redis, ambos se conectaran automaticamente al terminar su instalación. 

Ya puesto en marcha el servidor estara alojado en [http://localhost:3000](http://localhost:3000)
