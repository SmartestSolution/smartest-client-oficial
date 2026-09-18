# Liberar a Central de Trabalho para clientes

## Objetivo
Permitir que clientes acessem a Central de Trabalho e acompanhem todas as tarefas dos projetos visíveis da própria empresa, sem enxergar dados de outras empresas.

## Alterações
- Manter a Central de Trabalho disponível no menu principal para administradores e clientes.
- Para clientes, remover o filtro de empresa e identificar a fila como pertencente à empresa do usuário.
- Consolidar tarefas de projeto e chamados de suporte dos projetos permitidos para a empresa.
- Permitir que clientes iniciem, concluam, agendem e reabram tarefas acessíveis pela Central.
- Adicionar regras de segurança no banco para leitura e atualização somente quando o usuário tiver acesso ao projeto; chamados globais serão limitados a usuários da mesma empresa.
- Preservar a visão global para administradores.

## Validação
- Conferir tipos e testes automatizados.
- Validar que a página continua acessível pela rota protegida e pelo menu do cliente.
