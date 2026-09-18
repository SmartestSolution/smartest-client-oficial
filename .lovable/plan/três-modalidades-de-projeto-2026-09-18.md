# Três modalidades de projeto

## Objetivo
Separar a **modalidade de execução** da categoria atual do projeto. BI, Automação e SQL continuarão existindo, enquanto cada projeto também será classificado como **Padrão**, **Retroativo** ou **Personalizado**.

## Criação de projetos
- Unificar a criação em um único botão **Novo Projeto**.
- Incluir a escolha da modalidade antes dos demais dados.
- Manter os campos de categoria (BI, Automação ou SQL), nome, descrição e período.
- Validar que a data final não seja anterior à inicial.

### Projeto Padrão
- Criar automaticamente as cinco fases: Levantamento, Modelagem, Desenvolvimento, Homologação e Produção.
- Incluir todas as tarefas padrão existentes.
- Distribuir automaticamente as datas conforme os percentuais atuais: 15%, 25%, 45%, 10% e 5%.
- Iniciar com tarefas pendentes para acompanhamento em tempo real.

### Projeto Retroativo
- Criar as mesmas fases, tarefas e distribuição de datas do Projeto Padrão.
- Registrar projeto, fases e tarefas como concluídos.
- Usar os respectivos prazos planejados como datas de conclusão, evitando atraso ou atividade em tempo real.

### Projeto Personalizado
- Criar somente o projeto, sem fases e sem tarefas automáticas.
- Abrir a área de etapas para que o administrador monte livremente sua estrutura.
- Permitir ao administrador adicionar e excluir etapas; dentro de cada etapa, continuar adicionando e excluindo tarefas pelo checklist existente.

## Identificação e edição
- Adicionar ao banco um campo próprio para a modalidade, sem alterar o campo atual de categoria.
- Exibir a modalidade na lista de projetos.
- Permitir alterar dados gerais do projeto sem recriar ou apagar fases e tarefas existentes.
- Projetos antigos serão classificados como **Padrão** por compatibilidade.

## Banco e segurança
- Criar uma migração idempotente para a nova modalidade e seu índice.
- Manter as regras de acesso atuais por empresa e administrador.
- Usar as permissões existentes das tabelas de projetos, etapas e tarefas.

## Verificação
- Validar a criação das três modalidades.
- Confirmar que Padrão e Retroativo recebem as cinco fases e tarefas corretas.
- Confirmar que Personalizado nasce vazio e aceita etapas e tarefas manuais.
- Conferir a visualização da lista em telas menores e maiores.
