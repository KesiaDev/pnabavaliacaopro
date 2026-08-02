-- Título do projeto, extraído automaticamente do formulário de inscrição pelo
-- agente bonus_h_j (mesma chamada que já extrai tipo de proponente). Usado
-- pra preencher o campo "PROJETO:" na ficha oficial do Edital 120/2026 —
-- antes ficava sempre em branco porque a plataforma não guardava esse dado.
-- Nullable e nunca inventado: se o formulário não tiver um campo de título
-- explícito, o agente não preenche, em vez de adivinhar a partir da
-- descrição do projeto.
alter table public.proponents add column if not exists nome_projeto text;
