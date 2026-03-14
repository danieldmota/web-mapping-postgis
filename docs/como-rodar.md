# Como rodar o projeto

Passo a passo para rodar

---

## 1. Pré-requisitos

- **Node.js** (recomendado v18 ou superior).  
  Verificar: `node -v`
- **PostgreSQL** (recomendado 14 ou superior) com a extensão **PostGIS** instalada.  
  Verificar: no `psql`, `SELECT PostGIS_Version();` deve retornar uma versão.

---

## 2. Banco de dados

### 2.1 Criar o banco (se ainda não existir)

No terminal ou no pgAdmin:

```bash
createdb pontos_map
```

Ou em SQL:

```sql
CREATE DATABASE pontos_map;
```

### 2.2 Conectar ao banco e criar tabelas

Conecte ao banco `pontos_map` e execute o script abaixo **uma vez**. O script habilita o PostGIS e cria as tabelas que o servidor espera.

Arquivo do script: **[schema.sql](../schema.sql)** na raiz do projeto. Conteúdo resumido:

- `CREATE EXTENSION IF NOT EXISTS postgis;`
- Tabela `pontos`: `id`, `nome`, `descricao`, `localizacao` (geometry Point, SRID 4326)
- Tabela `linhas`: `id`, `nome`, `descricao`, `geometria` (geometry LineString, SRID 4326)
- Tabela `poligonos`: `id`, `nome`, `descricao`, `geometria` (geometry Polygon, SRID 4326)

Comando (ajuste usuário e nome do banco se precisar):

```bash
psql -U postgres -d pontos_map -f schema.sql
```

Ou abra o `schema.sql` no pgAdmin e execute no banco `pontos_map`.

---

## 3. Variável de ambiente

O servidor Node usa **apenas** a variável `DATABASE_URL` para conectar ao PostgreSQL.

### 3.1 Formato

```
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
```

Exemplos:

- Local, usuário `postgres`, senha `postgres`, banco `pontos_map`:
  ```
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pontos_map
  ```
- Com SSL (ex.: alguns provedores em nuvem):
  ```
  DATABASE_URL=postgresql://user:pass@host:5432/pontos_map?sslmode=require
  ```

### 3.2 Onde definir

Crie um arquivo **`.env`** na **raiz do projeto** (mesmo nível do `server.js`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pontos_map
```

---

## 4. Instalar dependências e subir a API

Na raiz do projeto:

```bash
npm install
node server.js
```

Saída esperada:

- `Servidor rodando na porta 3000`
- A URL do banco no console (por causa do `console.log` do `DATABASE_URL`)

A **API fica em `http://localhost:3000`**. O frontend já está configurado para usar essa URL (em `js/map.js`: `API_URL = "http://localhost:3000"`).

Se a porta 3000 estiver em uso, você precisa alterar em dois lugares:

1. Em **server.js**: na última linha, trocar `app.listen(3000, ...)` pela porta desejada.
2. Em **js/map.js**: trocar `API_URL` para a mesma porta, por exemplo `http://localhost:3001`.

---

## 5. Abrir o frontend

O frontend faz requisições à API com `fetch`. Abrir o `index.html` direto (protocolo `file://`) costuma dar bloqueio de CORS ou políticas do navegador. Por isso é necessário **servir os arquivos por HTTP**.

### Servidor estático em outra porta (recomendado)

Com a API já rodando na porta 3000:

```bash
npx serve . -l 5000
```

Depois abra no navegador: **http://localhost:5000**

Assim:

- API: `http://localhost:3000`
- Frontend: `http://localhost:5000` (usa a API em 3000; CORS já está habilitado no servidor)

---

## 6. Resumo rápido (depois de tudo configurado)

1. Banco criado e `schema.sql` executado no `pontos_map`.
2. `.env` na raiz com `DATABASE_URL` correto.
3. Terminal 1: `npm install` e `node server.js` (API na 3000).
4. Terminal 2: `npx serve . -l 5000` (frontend na 5000).
5. Navegador: **http://localhost:5000**

Se algo falhar:

- **API não inicia:** confira `DATABASE_URL`, conexão com o PostgreSQL e se o PostGIS está instalado.
- **Mapa em branco ou erros no console:** confira se a API está no ar em `http://localhost:3000` e se você está acessando o frontend por HTTP (não por `file://`).
- **Erro 404 nas requisições:** confirme a porta em `server.js` e o valor de `API_URL` em `js/map.js`.
