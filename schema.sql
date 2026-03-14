-- Banco: pontos_map (crie com CREATE DATABASE pontos_map;)
-- Execute este arquivo uma vez no banco

CREATE EXTENSION IF NOT EXISTS postgis;

-- Pontos (eventos/locais)
CREATE TABLE IF NOT EXISTS pontos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255),
  descricao TEXT,
  localizacao GEOMETRY(Point, 4326)
);

-- Linhas (trajetos)
CREATE TABLE IF NOT EXISTS linhas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255),
  descricao TEXT,
  geometria GEOMETRY(LineString, 4326)
);

-- Polígonos (áreas)
CREATE TABLE IF NOT EXISTS poligonos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255),
  descricao TEXT,
  geometria GEOMETRY(Polygon, 4326)
);
