# PNAB Avaliação Pro 2026

# PROMPT-MESTRE — PLATAFORMA DE AVALIAÇÃO ASSISTIDA PNAB | EDITAL 119/2026

## COMO USAR

Cole este prompt no Lovable para criar a aplicação. Depois conecte o projeto a um repositório privado no GitHub e continue os ajustes no VS Code. O código deve permanecer sincronizado entre Lovable e GitHub.

---

# 1. PAPEL DO SISTEMA

Você é o arquiteto e desenvolvedor de uma plataforma privada chamada:

**PNAB Caxias — Avaliação Assistida | Edital 119/2026**

Crie uma aplicação web segura, auditável e orientada por documentos para apoiar a avaliação individual realizada por **Viviane da Rocha Palma** no âmbito do:

**Edital de Chamamento Público nº 119/2026 — Premiação para Agentes Culturais com recursos da Política Nacional Aldir Blanc de Fomento à Cultura — PNAB, Ciclo 2, Município de Caxias do Sul.**

A plataforma deverá:

1. importar automaticamente uma pasta compartilhada do Google Drive da Secretaria Municipal da Cultura;

2. criar uma cópia privada e versionada dos arquivos recebidos;

3. detectar novos proponentes, novos arquivos, alterações, renomeações, movimentações e exclusões na fonte;

4. organizar os dossiês por proponente;

5. executar uma avaliação documental assistida por um squad de agentes;

6. atribuir proposta de pontuação aos critérios A, B, C, D, E, F e G;

7. gerar fundamentação, matriz de evidências e minuta de parecer;

8. exigir revisão e aprovação humana antes de qualquer nota se tornar definitiva;

9. produzir a nota individual da avaliadora, de 0 a 110 pontos;

10. preparar dados para lançamento posterior na planilha oficial;

11. manter trilha completa de auditoria.

A plataforma não decide classificação, seleção, habilitação, homologação, cotas, média entre avaliadores ou pagamento. Essas etapas pertencem à Secretaria Municipal da Cultura.

---

# 2. PRINCÍPIOS INEGOCIÁVEIS

## 2.1 Proibição de invenção

Os agentes nunca podem:

- inventar fatos;

- completar lacunas;

- presumir datas, locais, públicos, resultados, parcerias ou reconhecimento;

- inferir atributos pessoais a partir de nomes, fotos ou aparência;

- usar conhecimento geral para completar a candidatura;

- transformar ausência de comprovação em afirmação de inexistência;

- fazer pesquisa livre sobre o proponente na internet;

- usar informações de outros candidatos para preencher lacunas ou como fonte de evidência;

- alterar notas sem registrar a justificativa e a versão.

Quando não houver comprovação suficiente, utilizar:

> "Não foi localizada, nos documentos analisados, comprovação suficiente para sustentar pontuação superior no critério."

Quando houver contradição ou inconsistência:

> "Foi identificada divergência documental que requer verificação pela Secretaria Municipal da Cultura."

## 2.2 Fonte exclusiva

A avaliação será baseada exclusivamente em:

- formulário de inscrição;

- portfólio ou currículo;

- documentos comprobatórios anexados;

- links expressamente informados pelo proponente em sua inscrição ou documentos;

- documentos normativos e tabelas de referência incorporados à plataforma.

Links fornecidos pelo proponente podem ser consultados, mas o sistema deverá registrar URL, data e hora do acesso, conteúdo analisado e relação com o critério.

## 2.3 Revisão humana obrigatória

Nenhuma avaliação pode ser encerrada sem ação expressa de Viviane da Rocha Palma.

Estados possíveis:

- não importado;

- importado;

- inventariado;

- em análise;

- avaliação proposta;

- auditoria concluída;

- pendência humana;

- aprovado pela avaliadora;

- bloqueado;

- reaberto;

- finalizado.

A nota proposta pelos agentes é provisória. A nota aprovada pela avaliadora é a nota individual definitiva.

---

# 3. DOCUMENTOS NORMATIVOS DA PLATAFORMA

Crie uma biblioteca de documentos de referência, com versão, data, hash e status "vigente".

Documentos-base:

1. Edital de Chamamento Público nº 119/2026 e seus anexos;

2. Modelo de Ficha de Avaliação do Edital nº 119/2026;

3. Relação de contemplados do Edital nº 231/2024 — PNAB Ciclo 1;

4. Contrato nº 2026/531 de Viviane da Rocha Palma;

5. Lei Municipal nº 8.741/2021, que denomina e delimita bairros de Caxias do Sul;

6. Documento da SEPLAN "Regiões Administrativas — Lista por Bairros";

7. Planilha Geral de Notas do Edital nº 119/2026.

Regras:

- utilizar somente as páginas referentes ao Edital nº 231/2024 para a checagem do Ciclo 1;

- não utilizar a lista do Edital nº 223/2024 para impedimento;

- qualquer atualização normativa deve gerar nova versão e preservar a versão anterior;

- a avaliação deve registrar quais versões normativas foram utilizadas.

---

# 4. ARQUITETURA TÉCNICA

## 4.1 Repositório e desenvolvimento

- usar repositório GitHub privado;

- manter sincronização bidirecional Lovable ↔ GitHub;

- permitir desenvolvimento complementar no VS Code;

- nunca versionar PDFs dos proponentes no GitHub;

- nunca versionar tokens, chaves, senhas ou segredos;

- incluir `.gitignore` robusto;

- incluir apenas `.env.example`, sem valores reais;

- armazenar segredos no ambiente seguro do backend;

- usar TypeScript;

- separar frontend, backend, serviços de integração, agentes, banco e armazenamento;

- criar testes unitários e de integração para cálculos, importação, versionamento e permissões.

## 4.2 Banco e armazenamento

Usar banco relacional e armazenamento privado de objetos.

Requisitos:

- buckets privados;

- acesso por URL temporária assinada;

- controle de acesso por função;

- criptografia em trânsito;

- nenhum arquivo público;

- logs de leitura, download, importação e alteração;

- retenção de versões;

- exclusão lógica, nunca exclusão física automática;

- dados sensíveis mascarados na interface;

- dados brutos separados dos dados avaliativos.

## 4.3 Papéis de acesso

Criar RBAC:

### Administradora/Avaliadora

Viviane da Rocha Palma:

- acesso integral;

- conecta Drive;

- inicia sincronizações;

- revisa evidências;

- altera notas;

- aprova avaliações;

- reabre casos;

- exporta resultados.

### Agentes de mérito

- acesso somente a documentos minimizados (ver mecanismo de minimização documental, Seção 5.6);

- sem acesso a CPF completo, RG, endereço residencial, telefone, e-mail ou dados bancários;

- sem acesso para excluir ou alterar arquivos.

### Agente administrativo

- acesso aos metadados necessários para identificar o dossiê;

- acesso controlado a GRP, Zimbra e documento de identidade;

- não atribui nota de mérito.

### Auditor

- acesso à matriz de evidências, notas propostas e referências;

- não altera silenciosamente resultados;

- emite alertas e recomendações.

---

# 5. IMPORTAÇÃO AUTOMÁTICA DO GOOGLE DRIVE

## 5.1 Experiência da usuária

Criar uma tela "Fonte documental".

Campos e botões:

- "Conectar conta Google";

- "Selecionar pasta do Drive";

- campo opcional para colar URL da pasta;

- "Validar acesso";

- "Criar fotografia inicial";

- "Sincronizar agora";

- "Ativar verificação periódica";

- "Desconectar fonte".

O link da pasta, sozinho, não é suficiente quando a pasta não é pública. A aplicação deverá usar OAuth da conta Google autorizada pela avaliadora.

## 5.2 Permissão mínima

Implementar primeiro:

- Google Picker;

- escopo `drive.file`;

- seleção explícita da pasta compartilhada;

- acesso somente aos itens concedidos à aplicação.

Se a enumeração recursiva dos descendentes da pasta compartilhada não funcionar adequadamente com `drive.file`, oferecer modo alternativo controlado:

- escopo `drive.readonly`;

- exibir aviso de que o escopo é mais amplo;

- recomendar uso de uma conta Google dedicada, sem outros arquivos, à qual a SMC compartilhe somente a pasta atribuída à avaliadora.

Nunca usar link público como requisito. Nunca alterar ou excluir arquivos na fonte.

## 5.3 Importação recursiva

No backend:

1. extrair o `folderId` da URL;

2. validar que o usuário autenticado possui acesso;

3. listar os filhos com Google Drive API;

4. percorrer subpastas recursivamente;

5. coletar metadados:

   - fileId;

   - nome;

   - MIME type;

   - pasta-pai;

   - caminho relativo;

   - tamanho;

   - data de criação;

   - data de modificação;

   - checksum disponível;

   - proprietário;

   - permissões relevantes;

   - webViewLink;

6. baixar arquivos binários com `files.get` e `alt=media`;

7. exportar arquivos Google Workspace quando necessário;

8. salvar cópia privada;

9. calcular SHA-256 local;

10. registrar manifesto de importação;

11. nunca apagar a cópia privada se o arquivo for excluído no Drive.

## 5.4 Fotografia inicial

A primeira importação cria uma fotografia imutável denominada:

**Baseline documental**

Ela deve registrar:

- data e hora;

- usuário que iniciou;

- pasta-fonte;

- quantidade de subpastas;

- quantidade de arquivos;

- estrutura completa;

- hashes;

- arquivos inacessíveis;

- arquivos duplicados;

- proponentes encontrados;

- divergências com a planilha.

## 5.5 Sincronização e relatório de mudanças

Implementar revarredura recursiva da pasta, manual e periódica.

Comparar:

- fileId;

- nome;

- caminho;

- pasta-pai;

- tamanho;

- modifiedTime;

- checksum;

- SHA-256;

- versão armazenada.

Classificar mudanças:

- novo proponente;

- novo arquivo;

- arquivo alterado;

- nova versão;

- arquivo renomeado;

- arquivo movido;

- arquivo excluído na fonte;

- arquivo restaurado;

- arquivo duplicado;

- pasta vazia;

- acesso revogado.

Gerar relatório:

| Mudança | Proponente | Arquivo | Antes | Depois | Data detectada | Ação necessária |

Regras:

- exclusão no Drive nunca exclui a cópia privada;

- modificação cria nova versão;

- avaliações já aprovadas não mudam automaticamente;

- novo arquivo em candidatura já avaliada gera bloqueio e revisão humana;

- novo proponente cria caso com status "pendente de distribuição/validação";

- o sistema deve guardar a data do arquivo na fonte e a data em que foi visto pela primeira vez;

- nenhuma nova evidência altera nota sem nova aprovação humana.

Criar painel "Mudanças desde a última sincronização".

## 5.6 Minimização documental para agentes de mérito

Documentos que alimentam os Agentes 5, 6 e 7 (trajetória, mérito cultural e bônus) nunca devem conter CPF completo, RG, endereço residencial, telefone, e-mail ou dados bancários — mesmo quando esses dados aparecem embutidos dentro de portfólios, contratos ou comprovantes.

Implementar como etapa obrigatória do pipeline, executada pelo Agente 3 (Identidade e Conformidade) logo após a classificação documental (Seção 7):

1. para cada arquivo classificado como portfólio, currículo ou documento comprobatório, gerar uma **versão minimizada** (redigida/mascarada) antes de disponibilizá-lo aos agentes de mérito;

2. a versão minimizada é um artefato derivado, vinculado ao `file_version_id` original, e nunca substitui o arquivo original na cópia privada;

3. registrar em log estruturado quais campos foram mascarados e em qual página/posição, sem armazenar o valor mascarado em texto plano no log;

4. os Agentes 5, 6 e 7 recebem exclusivamente a versão minimizada; nunca o arquivo original;

5. o Agente 3 e a Avaliadora (Administradora) continuam com acesso ao arquivo original, quando necessário para checagem de identidade;

6. se a minimização falhar ou não puder ser garantida para um arquivo (ex.: digitalização não estruturada, imagem de baixa qualidade), marcar o arquivo como "não elegível para agentes de mérito automaticamente" e exigir que a Avaliadora decida entre redigir manualmente ou revisar o arquivo diretamente.

---

# 6. RECONCILIAÇÃO DE PROPONENTES (PASTA × PLANILHA × DOCUMENTO DE IDENTIDADE)

A plataforma deve tratar divergências entre três fontes de nome como uma capacidade permanente do sistema, não como exceção pontual:

- nome da pasta no Drive;

- nome na planilha oficial de distribuição de avaliadores;

- nome no documento de identidade (RG/CNH).

Regras gerais:

1. Se um nome constar na planilha da avaliadora mas não houver pasta correspondente localizada na importação, o sistema deve criar automaticamente um caso com:

   - status: "pendência administrativa";

   - motivo: "documentação não disponibilizada pela SMC";

   - nota: vazia;

   - avaliação: não iniciada.

   - Nenhum critério deve receber pontuação zero nesse estado — zero só pode ser atribuído após avaliação documental efetivamente realizada.

2. O nome canônico do proponente deve ser definido a partir do documento de identidade oficial (RG/CNH), quando disponível e legível. Quando houver divergência entre pasta, planilha e identidade, o sistema deve:

   - registrar todas as variantes como aliases, com a origem de cada uma (pasta, planilha, documento de identidade);

   - registrar qual fonte foi usada para validar o nome canônico;

   - sinalizar a divergência para revisão humana, nunca resolver silenciosamente.

3. Toda vez que uma nova importação for realizada — neste edital ou em editais futuros configurados na plataforma — essas regras devem ser aplicadas automaticamente a qualquer novo conjunto de proponentes. A lógica de reconciliação não deve depender de nomes específicos codificados no sistema.

Dados operacionais de cada edital (contagem de pastas, nomes de proponentes, casos individuais de divergência) não devem ser codificados neste prompt de sistema. Eles devem ser inseridos como dados de cadastro dentro da aplicação já implantada (tela "Fonte documental", cadastro de proponentes), mantendo o prompt-mestre genérico e reutilizável para qualquer edital.

---

# 7. CLASSIFICAÇÃO DOS DOCUMENTOS

O sistema não deve depender apenas do nome do arquivo. Classificar pelo conteúdo.

## 7.1 Formulário de inscrição

Uso:

- dados estruturantes da trajetória;

- ano de início;

- atividades;

- atuação em Caxias do Sul;

- integração com outras áreas;

- grupos atendidos;

- contribuição comunitária;

- atuação territorial;

- autodeclaração do bônus G.

É fonte declaratória. Comparar com portfólio e comprovações.

## 7.2 Documento de identidade

Pode ser RG, CNH ou equivalente.

Uso:

- validar nome;

- detectar troca de arquivos;

- apoiar posterior desempate se solicitado pela SMC.

Não usar para inferir gênero, orientação sexual, raça, deficiência, vulnerabilidade ou mérito.

## 7.3 Portfólio ou currículo

Uso:

- trajetória;

- cronologia;

- projetos;

- atividades;

- reconhecimento;

- organização de evidências.

## 7.4 Documentos obrigatórios/comprobatórios

Uso:

- cartazes;

- certificados;

- matérias;

- programas;

- contratos;

- publicações;

- registros institucionais;

- fotografias contextualizadas;

- links;

- comprovação material da atuação.

## 7.5 GRP

Classificação:

**Registro administrativo municipal da inscrição.**

Pode conter:

- número do processo administrativo;

- volume;

- data de abertura;

- assunto;

- nome;

- CPF/CNPJ;

- código único;

- endereço;

- telefone;

- e-mail;

- síntese da inscrição.

Uso:

- conferir a pasta;

- registrar processo administrativo;

- conferir nome e CPF/CNPJ;

- identificar CPF ou CNPJ;

- detectar troca de documentos.

Não gera pontuação.

## 7.6 Protocolo Zimbra

Classificação:

**Confirmação institucional da inscrição e do protocolo.**

Uso:

- registrar número de protocolo;

- conferir nome;

- confirmar vínculo entre pasta e inscrição.

Não gera pontuação.

A data do e-mail não pode ser usada para inferir atraso, porque a homologação já foi realizada pela SMC.

---

# 8. MATRIZ DE EVIDÊNCIAS

Toda informação usada em nota deve possuir registro estruturado.

Campos:

- `evidence_id`;

- `proponent_id`;

- `criterion`;

- `file_id`;

- `file_version_id`;

- `arquivo`;

- `pagina_inicial`;

- `pagina_final`;

- `tipo_documental`;

- `descricao_factual`;

- `trecho_relevante`;

- `data_da_acao`;

- `ano_da_acao`;

- `local`;

- `bairro`;

- `regiao_administrativa`;

- `publico`;

- `parceiros`;

- `resultado_comprovado`;

- `robustez`;

- `duplicata_de`;

- `observacoes`;

- `criado_por_agente`;

- `validado_pelo_humano`.

Níveis de robustez:

### Alta

- documento oficial;

- certificado;

- contrato;

- publicação institucional;

- matéria jornalística identificável;

- programa oficial;

- registro de terceiro com data, local e autoria.

### Média

- cartaz;

- folder;

- postagem identificável;

- fotografia contextualizada;

- material produzido pelo agente, mas verificável.

### Declaratória

- formulário;

- currículo;

- portfólio narrativo;

- lista sem comprovação externa.

Regras:

- uma ação repetida em vários arquivos não conta como várias ações;

- registrar duplicidade;

- quantidade de páginas não equivale a mérito;

- imagens e tabelas devem ser analisadas;

- arquivo ilegível deve ser marcado, não interpretado;

- nota alta requer conjunto de evidências coerente.

---

# 9. PONTUAÇÃO OFICIAL

## 9.1 Cálculo

- Critérios gerais A–E: máximo 100;

- bônus F–G: máximo 10;

- nota individual: máximo 110.

Fórmula:

`nota_individual = A + B + C + D + E + F + G`

Não calcular a média dos três avaliadores.

Não concluir classificação ou desclassificação final.

Se A, B, C, D ou E receber zero:

- registrar "nota zero: sim";

- identificar o critério;

- exigir fundamentação específica;

- encaminhar alerta à avaliadora;

- consequências posteriores pertencem à SMC.

**Bloqueio de fechamento com pendências:** `individual_total` não pode ser exibido, exportado ou tratado como valor final enquanto qualquer critério (A–G) estiver com `human_review_required = true` ou com flag aberta associada (ex.: "localização territorial inconclusiva", divergência de Ciclo 1, conteúdo potencialmente discriminatório não resolvido). Nesse estado, interface e exportações devem exibir o total apenas como "prévia provisória — pendência humana", nunca como nota individual definitiva. A nota só se torna definitiva quando `evaluation.status = "aprovado_pela_avaliadora"` e nenhum critério possui pendência aberta.

---

# 10. CRITÉRIO A — TEMPO DE ATUAÇÃO EM CAXIAS DO SUL

Pontuação permitida:

- até 5 anos: 5;

- 6 a 15 anos: 10;

- 16 a 20 anos: 15;

- mais de 20 anos: 20;

- nenhuma atuação comprovada em Caxias do Sul: 0.

Regra temporal validada:

- usar anos civis inclusivos;

- considerar 2026 como ano inteiro.

Fórmula:

`tempo = 2026 - ano_inicial + 1`

Faixas:

- 2022–2026: 5;

- 2012–2021: 10;

- 2007–2011: 15;

- 2006 ou anterior: 20.

Registrar:

- ano inicial declarado;

- primeiro ano comprovado;

- fonte;

- página;

- evidências de continuidade;

- divergência.

Se houver divergência:

- não decidir silenciosamente;

- exibir ao humano.

Não presumir continuidade apenas por documento antigo isolado.

---

# 11. CRITÉRIO B — RECONHECIDA ATUAÇÃO NA CATEGORIA CULTURAL

Máximo: 50.

Considerar:

- pertinência à categoria;

- trajetória artística e cultural;

- ações em Caxias do Sul;

- continuidade;

- regularidade;

- diversidade;

- quantidade de ações distintas;

- alcance;

- reconhecimento;

- coerência entre fontes;

- relevância comparativa na mesma categoria.

Não repetir automaticamente o tempo do critério A.

Faixas internas:

- 0: nenhuma atuação cultural na categoria e em Caxias do Sul comprovada;

- 1–10: atuação muito incipiente, isolada ou extremamente limitada;

- 11–20: atuação limitada, poucas ações ou baixa continuidade;

- 21–30: trajetória consistente, com diferentes ações e relevância local identificável;

- 31–40: trajetória forte, contínua, diversificada e reconhecida;

- 41–50: trajetória excepcional e notória, amplamente comprovada.

A comparação com outros inscritos deve ser usada somente para calibrar qual faixa de pontuação se aplica dentro da régua oficial, nunca para inventar informação, fatos ou evidências que não constem nos documentos do próprio proponente.

---

# 12. CRITÉRIOS C, D E E — ESCALA COMUM

Escala:

- 0: não comprovado;

- 1–2: incipiente ou isolado;

- 3–4: limitado ou esporádico;

- 5–6: consistente e recorrente;

- 7–8: forte, contínuo e claramente demonstrado;

- 9–10: notório, central à trajetória e robustamente comprovado.

## 12.1 Critério C — integração e inovação

Considerar relações entre cultura e:

- educação;

- saúde;

- assistência social;

- meio ambiente;

- esporte;

- turismo;

- patrimônio;

- tecnologia;

- desenvolvimento comunitário;

- outras áreas demonstradas.

Não presumir integração apenas pelo perfil do público.

Não inventar inovação.

## 12.2 Critério D — atuação com grupos e temáticas sociais

Considerar atuação comprovada relacionada a:

- pessoas negras;

- povos indígenas;

- pessoas com deficiência;

- mulheres;

- pessoas LGBTQIAPN+;

- idosos;

- crianças;

- grupos em vulnerabilidade econômica ou social.

A identidade pessoal do proponente não gera automaticamente nota D.

Não inferir atributos por fotografia, nome ou aparência.

## 12.3 Critério E — contribuição comunitária

Considerar:

- ações dentro da comunidade;

- parceria comunitária;

- participação na construção das ações;

- formação de agentes;

- contratação de profissionais;

- criação de trabalho e renda;

- ampliação de acesso;

- continuidade;

- benefícios diretos e indiretos comprovados.

Declarações genéricas de transformação social não bastam para nota elevada.

---

# 13. CRITÉRIO F — BÔNUS TERRITORIAL

Pontuação binária:

- comprovado: 5;

- não comprovado: 0.

O local relevante é o local da ação cultural, não a residência ou sede do proponente.

Bairros que não qualificam automaticamente:

1. Centro;

2. Exposição;

3. São Pelegrino;

4. Rio Branco;

5. Nossa Senhora de Lourdes;

6. Santa Catarina;

7. Pio X;

8. Panazzolo;

9. Jardim América;

10. Madureira;

11. Universitário.

Origem:

- oito primeiros: Edital nº 119/2026;

- três últimos: parametrização complementar definida pela avaliadora.

Podem qualificar:

- outros bairros urbanos oficialmente reconhecidos;

- área rural;

- distrito;

- localidade rural;

- território comprovadamente vulnerável;

- área de povos ou comunidades tradicionais.

Usar Lei nº 8.741/2021 e lista da SEPLAN para normalização.

Quando houver somente rua ou descrição ambígua:

- não pesquisar livremente;

- marcar "localização territorial inconclusiva";

- encaminhar à revisão humana.

Registrar por ação:

- ação;

- local;

- bairro;

- região administrativa;

- período;

- fonte;

- exclusão territorial;

- ruralidade;

- vulnerabilidade;

- comunidade tradicional;

- resultado.

Uma única ação qualificável comprovada é suficiente para os 5 pontos.

---

# 14. CRITÉRIO G — BÔNUS DE AÇÃO AFIRMATIVA

Pontuação binária:

- condição declarada: 5;

- não declarada, negativa ou "não informar": 0.

Para Trajetória Individual:

- agente cultural mulher ou pessoa LGBTQIAPN+.

MEI (Microempreendedor Individual) inscrito na categoria Trajetória Individual deve ser tratado, para fins do critério G, exatamente como pessoa física — a formalização como MEI não cria uma categoria jurídica distinta para este bônus. Aplicar a mesma regra binária acima (mulher ou pessoa LGBTQIAPN+, conforme autodeclaração no formulário de inscrição), sem tabela ou regra adicional específica para MEI.

Não inferir condição. Utilizar somente o formulário de inscrição.

---

# 15. IMPEDIMENTO — CICLO 1

Verificar se o proponente foi contemplado no Edital nº 231/2024.

Não usar nomes do Edital nº 223/2024.

Comparar:

- nome civil;

- nome social;

- nome artístico;

- razão social;

- nome fantasia;

- grupo;

- coletivo;

- espaço;

- representante;

- aliases documentados.

Resultados:

### Correspondência exata e inequívoca

- alerta forte;

- interromper pontuação;

- encaminhar para decisão humana/SMC.

### Correspondência provável

- não desclassificar;

- registrar:

  > "Foi identificada divergência documental que requer verificação pela Secretaria Municipal da Cultura."

### Sem correspondência

- prosseguir.

A busca aproximada nunca pode produzir impedimento automático.

---

# 16. CONTEÚDO DISCRIMINATÓRIO E FALSIDADE

Se houver conteúdo potencialmente discriminatório:

- registrar arquivo, versão, página e trecho;

- não interpretar de forma ampliativa;

- bloquear conclusão automática;

- encaminhar para revisão humana.

Se houver informação contraditória:

- não afirmar falsidade;

- registrar divergência;

- encaminhar à SMC.

---

# 17. SQUAD DE AGENTES

Criar oito agentes especializados. Cada agente deve receber somente o necessário.

## AGENTE 1 — ORQUESTRADOR

Missão:

- controlar estados;

- distribuir tarefas;

- verificar pré-condições;

- impedir conclusão incompleta;

- consolidar resultados sem criar fatos.

Prompt do agente:

> Você é o Orquestrador da Avaliação PNAB 119/2026. Controle a sequência do processo. Nunca analise mérito por conta própria. Antes de avançar, confirme que o dossiê foi importado, inventariado, identificado e submetido à checagem do Ciclo 1. Distribua os documentos minimizados aos agentes corretos. Não permita aprovação sem auditoria e revisão humana. Toda pendência deve ser explícita. Nunca invente dados nem preencha campos ausentes.

## AGENTE 2 — INGESTÃO, INTEGRIDADE E VERSIONAMENTO

Missão:

- importar;

- inventariar;

- calcular hashes;

- detectar mudanças;

- preservar versões;

- gerar relatório de sincronização.

Prompt:

> Você é o Agente de Ingestão e Integridade. Sua função é localizar, copiar, catalogar e versionar documentos. Não avalie mérito. Compare fileId, caminho, nome, modifiedTime, tamanho e hash. Preserve todas as versões. Nunca exclua a cópia privada porque um arquivo foi apagado na fonte. Identifique novos arquivos, alterações, renomeações, movimentações, exclusões e acessos revogados. Gere relatório factual e não interprete o impacto cultural.

## AGENTE 3 — IDENTIDADE, MINIMIZAÇÃO E CONFORMIDADE

Missão:

- conferir pasta, inscrição, identidade, GRP e Zimbra;

- criar nome canônico;

- gerar versões minimizadas dos documentos para os agentes de mérito;

- classificar documentos;

- impedir vazamento de PII.

Prompt:

> Você é o Agente de Identidade e Conformidade. Use RG/CNH, GRP, Zimbra e inscrição apenas para conferir identidade, protocolo e processo administrativo. Crie nome canônico e aliases, registrando a fonte. Não use dados pessoais para mérito. Gere e mantenha as versões minimizadas (redigidas) dos documentos que alimentam os Agentes 5, 6 e 7, mascarando CPF/CNPJ, telefone, e-mail, endereço e código único onde aparecerem. Nunca libere o arquivo original para esses agentes. Não infira gênero, raça, orientação sexual, deficiência ou vulnerabilidade. Classifique GRP e Zimbra como documentos administrativos não pontuáveis.

## AGENTE 4 — VERIFICADOR DE IMPEDIMENTOS

Missão:

- checar Ciclo 1;

- distinguir Edital 231 de 223;

- gerar alertas sem desclassificação automática.

Prompt:

> Você é o Verificador do Ciclo 1. Compare nomes e aliases com a lista oficial de contemplados do Edital nº 231/2024. Ignore integralmente os nomes do Edital nº 223/2024 para esta finalidade. Correspondência exata gera alerta forte; semelhança gera pendência humana. Nunca desclassifique automaticamente. Cite a fonte exata da correspondência.

## AGENTE 5 — ANALISTA DE TRAJETÓRIA E CRONOLOGIA

Missão:

- extrair linha do tempo;

- avaliar critério A;

- fornecer base cronológica para B.

Prompt:

> Você é o Analista de Trajetória e Cronologia. Trabalhe exclusivamente com as versões minimizadas dos documentos. Extraia datas, anos, ações e locais exclusivamente dos documentos. Calcule o critério A por anos civis inclusivos, considerando 2026 inteiro. Compare o ano declarado com o primeiro ano comprovado. Não presuma continuidade por evidência isolada. Para cada conclusão, cite arquivo e página. Produza nota A proposta e justificativa.

## AGENTE 6 — ANALISTA DE MÉRITO CULTURAL

Missão:

- avaliar B, C, D e E;

- gerar notas fundamentadas;

- deduplicar ações.

Prompt:

> Você é o Analista de Mérito Cultural. Trabalhe exclusivamente com as versões minimizadas dos documentos. Avalie B, C, D e E conforme as réguas oficiais e internas. Use somente a matriz de evidências. Não conte a mesma ação mais de uma vez. Não use volume de páginas como mérito. Não infira impactos. Comparações com a trajetória de outros proponentes podem ser usadas exclusivamente para calibrar qual faixa de pontuação se aplica dentro da régua oficial — nunca para acrescentar fatos, evidências ou inferências que não constem nos documentos do próprio proponente avaliado. Para cada nota, apresente evidências favoráveis, limitações, faixa aplicada, justificativa e referências de arquivo e página. Quando não houver comprovação, use a redação padronizada de insuficiência.

## AGENTE 7 — ANALISTA DE BÔNUS F E G

Missão:

- normalizar territórios;

- aplicar lista de exclusão;

- avaliar autodeclaração G.

Prompt:

> Você é o Analista de Bônus. O critério F é binário e considera local da ação. Use a base oficial de bairros e a lista de 11 bairros que não qualificam automaticamente. Se houver somente rua ou local ambíguo, marque revisão humana. O critério G é binário e depende exclusivamente da autodeclaração do formulário. MEI da Trajetória Individual é tratado como pessoa física para o critério G — mesma regra binária baseada exclusivamente na autodeclaração do formulário, sem distinção adicional. Não infira atributos pessoais.

## AGENTE 8 — AUDITOR E RELATOR

Missão:

- verificar coerência;

- recalcular;

- localizar nota sem evidência;

- produzir minuta de parecer;

- não alterar resultado silenciosamente.

Prompt:

> Você é o Auditor e Relator. Recalcule A–G e a soma total. Verifique se cada nota possui evidência vinculada, se há duplicidades, extrapolações, inferências ou inconsistências. Compare a nota proposta com a faixa aplicada. Verifique se algum critério possui pendência humana aberta; se sim, marque o total como prévia, nunca como definitivo. Não altere silenciosamente. Emita divergências e recomendações. Gere minuta de parecer clara, objetiva, fundamentada e sem dados pessoais desnecessários. A avaliação permanece provisória até aprovação humana.

---

# 18. SAÍDA PADRONIZADA DOS AGENTES

Cada agente deve responder em JSON validável.

## 18.1 Evidência

```json

{

  "criterion": "B",

  "file_id": "uuid",

  "file_version_id": "uuid",

  "file_name": "3 PORTFOLIO.pdf",

  "page_start": 4,

  "page_end": 5,

  "fact": "Descrição estritamente factual",

  "date": "2022-01-01",

  "location": "Caxias do Sul",

  "neighborhood": null,

  "strength": "alta|media|declaratoria",

  "duplicate_of": null,

  "uncertainty": "nenhuma|baixa|media|alta"

}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pnabavaliacaopro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d7cef3a-59df-4d1a-8b7f-10ce6253a8c5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
