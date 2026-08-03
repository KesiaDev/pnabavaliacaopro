-- Backfill único: proponentes cujo processamento (pipeline de 12 etapas do
-- Railway) já tinha concluído ANTES da mudança que passou a atualizar
-- proponents.status automaticamente ao fim do job (ver
-- src/lib/internal-jobs.server.ts, handleUpdateStageRequest). Sem isso,
-- esses dossiês ficariam presos em "importado" para sempre, indistinguíveis
-- de quem nem começou a ser processado -- foi o Edital 120 que expôs o
-- caso real (Christian de Lima, Neli Bacarin Colussi).
--
-- Mesma condição de guarda usada no código: nunca mexe em quem já reflete
-- uma decisão humana/administrativa. Idempotente (pode rodar mais de uma
-- vez sem efeito colateral, mesma cautela das migrations anteriores deste
-- projeto).
update proponents p
set status = 'auditoria_concluida'
where p.status not in ('aprovado_pela_avaliadora', 'bloqueado', 'pendencia_administrativa')
  and exists (
    select 1
    from processing_jobs pj
    where pj.proponent_id = p.id
      and pj.status = 'concluido'
  );
