update proponents p
set status = 'auditoria_concluida'
where p.status not in ('aprovado_pela_avaliadora', 'bloqueado', 'pendencia_administrativa')
  and exists (
    select 1
    from processing_jobs pj
    where pj.proponent_id = p.id
      and pj.status = 'concluido'
  );