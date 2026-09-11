# Plano: unificar as telas de suporte

## Resultado
- O suporte global e o suporte dentro de cada projeto terão o mesmo visual e os mesmos recursos.
- As duas telas terão alternância entre **Backlog** e **Board**, com as colunas A Fazer, Em Progresso, Em Revisão e Concluído.
- Cada chamado mostrará separadamente a data da solicitação, o início agendado e a data final.
- A data da solicitação continuará automática e não poderá ser alterada.
- O início e o fim poderão ser definidos ao criar ou editar um chamado; o fim será opcional.
- Haverá atalhos para agendar o início em **1 hora** ou **amanhã no mesmo horário**, além da escolha manual de data e hora.
- No suporte global, o filtro e a identificação do projeto continuarão disponíveis.
- Clientes poderão abrir solicitações; somente administradores poderão planejar datas, responsável e movimentar chamados no Board.

## Implementação
- Criar uma área compartilhada de suporte para evitar diferenças futuras entre as duas páginas.
- Reaproveitar as regras atuais de status, prioridade, tipo, responsável e SLA.
- Validar que a data final não seja anterior à data de início.
- Garantir que mover um chamado para fora de “A Fazer” continue registrando automaticamente o início quando ele ainda não estiver planejado.
- Verificar as duas telas em tamanhos de computador e celular.
