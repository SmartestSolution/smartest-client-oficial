# Cronograma opcional em projetos personalizados

## Objetivo
Permitir que as etapas de projetos personalizados funcionem com ou sem datas, exibindo o Gantt somente quando houver um cronograma de etapas.

## Alterações
- Manter início e término das etapas personalizados como campos opcionais.
- Validar que, quando preenchidas, a data final da etapa não seja anterior à inicial.
- Ocultar a opção e o gráfico de Gantt em projeto personalizado sem nenhuma etapa com início e término definidos.
- Exibir o Gantt automaticamente quando ao menos uma etapa personalizada tiver o período completo.
- No Gantt, mostrar somente as etapas que tenham início e término definidos, sem criar barras a partir das datas das tarefas.
- Manter normalmente os campos de início e prazo de todas as tarefas personalizadas.

## Verificação
- Conferir projeto personalizado sem datas de etapas: tabela e tarefas disponíveis, sem Gantt.
- Conferir projeto personalizado com cronograma: opção Gantt disponível e barras das etapas datadas.
- Confirmar que tarefas continuam aceitando e exibindo suas próprias datas.
