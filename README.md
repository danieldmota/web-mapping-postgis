# Mapa Eventos

Aplicação web para visualizar e gerenciar **pontos**, **linhas** e **polígonos** em um mapa interativo. Os dados são armazenados em PostgreSQL com PostGIS.

## Resumo

- **Frontend:** HTML, CSS e JavaScript (Leaflet para o mapa).
- **Backend:** Node.js (Express) com API REST.
- **Banco:** PostgreSQL + PostGIS (geometrias).

Funcionalidades principais: criar/editar/deletar pontos, linhas e polígonos no mapa; edição de coordenadas nos formulários; importação de GeoJSON (Point → pontos, LineString → linhas, Polygon → polígonos).

## Como rodar

Passo a passo completo (pré-requisitos, banco, variáveis, dois terminais) está em:

- **[Como rodar o projeto (detalhado)](docs/como-rodar.md)**

Resumo:

1. **Requisitos:** Node.js, PostgreSQL com PostGIS.
2. **Banco:** criar o banco `mapa_eventos`, executar o script **`schema.sql`** (cria tabelas e extensão PostGIS).
3. **Variável de ambiente:** criar `.env` na raiz com `DATABASE_URL=postgresql://usuario:senha@localhost:5432/mapa_eventos` (veja `.env.example`).
4. **API:** `npm install` e `node server.js` (sobe na porta **3000**).
5. **Frontend:** Usar um servidor estático, `npx serve . -l 5000`, e acessar **http://localhost:5000**.

O frontend está configurado para falar com a API em `http://localhost:3000` (em `js/map.js`).

## Documentação

- [Como rodar o projeto (detalhado)](docs/como-rodar.md)
- [Visão geral e funcionalidades](docs/visao-geral.md)
- [Estrutura do projeto](docs/estrutura.md)
- [API REST](docs/api.md)

