# Agenda independente de projetos e consultorias

## Objetivo
Permitir que o administrador registre reuniões e dias de consultoria na Agenda Geral mesmo sem projeto, vinculando opcionalmente uma empresa, e mostrar esses compromissos na Central de Trabalho.

## Alterações
- Tornar projeto opcional no formulário da Agenda Geral.
- Adicionar uma seleção opcional de empresa, com a lista de empresas cadastradas.
- Quando houver projeto selecionado, associar automaticamente o compromisso à empresa desse projeto; sem projeto, usar a empresa escolhida ou deixar o compromisso geral.
- Adicionar o tipo **Consultoria** junto de Entrega, Reunião e Marco em todas as telas de agenda.
- Exibir na Central de Trabalho os compromissos dos tipos **Reunião** e **Consultoria**, usando a data agendada e identificando projeto/empresa quando existirem.
- Tratar reuniões e consultorias como compromissos de agenda: poderão ser consultados e abertos pela Central, sem os comandos de iniciar, concluir, reagendar ou solicitar prioridade destinados às tarefas.
- Atualizar a segurança dos dados para que administradores vejam todos os compromissos e clientes vejam apenas compromissos dos próprios projetos ou da própria empresa; compromissos totalmente gerais permanecem somente para administradores.

## Dados e segurança
- Tornar o vínculo com projeto opcional na tabela de compromissos.
- Adicionar um vínculo opcional com empresa.
- Manter os dois vínculos opcionais, mas garantir que o vínculo de empresa corresponda ao projeto quando ambos existirem.
- Atualizar as permissões de leitura e administração no mesmo script.

## Validação
- Validar criação e edição com: projeto, somente empresa e sem ambos.
- Confirmar que Reunião e Consultoria aparecem na Agenda Geral e na Central de Trabalho.
- Conferir isolamento por empresa para clientes.
- Executar verificação de tipos e testes automatizados.
