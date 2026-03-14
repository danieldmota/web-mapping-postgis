# Visão geral do projeto

## O que é

O **Mapa de pontos** é uma aplicação para cadastrar e editar elementos geográficos em um mapa: pontos (eventos ou locais), linhas (trajetos) e polígonos (áreas). Tudo é salvo no banco de dados e exibido no mapa em tempo real.

## Funcionalidades

### Pontos

- Criar ponto: ativar modo "Ponto", clicar no mapa para pegar as coordenadas e preencher o formulário (nome e descrição).
- Editar: clicar em um ponto no mapa para abrir o formulário de edição (nome, descrição e coordenadas editáveis).
- Deletar: pelo formulário de edição.

### Linhas

- Criar linha: ativar modo "Linha", clicar no mapa para definir os vértices e salvar pelo formulário (nome, descrição, coordenadas).
- Editar: clicar na linha no mapa; é possível alterar nome/descrição/coordenadas no form ou "Redesenhar geometria" (vértices arrastáveis).
- Deletar: botão "Deletar" no formulário de edição.

### Polígonos

- Criar polígono: ativar modo "Polígono", clicar no mapa para definir os vértices (fechar o polígono) e salvar pelo formulário.
- Editar: clicar no polígono; alterar dados no form ou redesenhar com vértices arrastáveis.
- Deletar: botão "Deletar" no formulário de edição.

### Importação

- Importar GeoJSON: envio de um GeoJSON com várias features; o sistema separa por tipo de geometria:
  - **Point** → tabela de pontos  
  - **LineString** → tabela de linhas  
  - **Polygon** → tabela de polígonos  

### Interface

- Formulários de criar e editar com nome, descrição e coordenadas (textarea editável).
- Coordenadas no formato "lat, lng" (uma por linha para linha/polígono).
- Mensagens de sucesso/erro e confirmação antes de deletar.

## Fluxo geral

1. O usuário interage com o mapa (desenho ou clique em elemento existente).
2. Os formulários (criar/editar) são preenchidos e permitem alterar nome, descrição e coordenadas.
3. As ações (criar, atualizar, deletar) são enviadas à API REST.
4. O backend persiste no PostgreSQL (PostGIS) e devolve os dados.
5. O frontend atualiza o mapa e as listas (carregando pontos, linhas e polígonos da API).

## Tecnologias

| Camada   | Tecnologia        |
|----------|-------------------|
| Mapa     | Leaflet           |
| Frontend | HTML, CSS, JS     |
| Backend  | Node.js, Express  |
| Banco    | PostgreSQL, PostGIS |

A comunicação entre frontend e backend é feita por JSON (GeoJSON quando aplicável) via `fetch` para os endpoints documentados em [API](api.md).
