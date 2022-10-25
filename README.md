# > *template_emca_web_api*

[pnpm](http://pnpm.io/) is the package manager in use.

<!-- TODO: document podman installation hicups -->

<!-- yay -S podman-compose aardvark-dns  -->
<!-- podman machine init -->

<!-- TODO: consider devcontainers -->


Expected environment variables:

```ini
# the following are used by the docker-compose files when setting up
# a fresh postgres container
DB_USERNAME=web_api
DB_PASSWORD=password

DATABASE_URL="postgres://web_api:password@localhost:5432/web_api"

# the following are required for test purposes
TEST_DB_USER=web_api
TEST_DB_PASS=password
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
```
