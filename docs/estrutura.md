
---

# Estrutura do Projeto

```
project
│
├── api
│   ├── routes
│   │   ├── import.js      # Rotas para importação de dados
│   │   ├── linhas.js      # CRUD de linhas
│   │   ├── poligonos.js   # CRUD de polígonos
│   │   ├── pontos.js      # CRUD de pontos
│   │   └── db.js          # Conexão com banco de dados
│
├── docs
│   ├── api.md             # Documentação da API
│   ├── como-rodar.md      # Guia de execução do projeto
│   ├── estrutura.md       # Explicação da estrutura do projeto
│   └── visao-geral.md     # Descrição geral da aplicação
│
├── imports-geojson
│   ├── ficticio.geojson   # Exemplo de dados GeoJSON
│   └── sanesul.geojson    # Dados geográficos para importação
│
├── js
│   ├── main.js            # Inicialização da aplicação
│   ├── map.js             # Lógica principal do mapa
│   └── ui.js              # Interações de interface
│
├── partials
│   └── sidebar.html       # Componente reutilizável da interface
│
├── .env.example           # Exemplo de configuração do ambiente
├── .gitignore
├── globals.css            # Estilos globais
├── index.html             # Página principal da aplicação
├── mapa-qgis.qgz          # Projeto QGIS utilizado no desenvolvimento
├── schema.sql             # Estrutura do banco de dados
├── server.js              # Servidor principal da aplicação
├── package.json
└── package-lock.json
```

---

# Formato de Dados

A API trabalha com **GeoJSON** para troca de dados geoespaciais.

Exemplo de ponto:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-54.6201, -20.4697]
  },
  "properties": {
    "nome": "Local de teste"
  }
}
```

---