# Evoluções padrão e personalizadas

## Objetivo
Permitir que o administrador escolha o modelo ao criar uma evolução de projeto:
- **Padrão:** cria automaticamente as cinco etapas (Levantamento, Modelagem, Desenvolvimento, Homologação e Produção) com todas as tarefas padrão.
- **Personalizada:** cria a evolução vazia para o administrador cadastrar livremente etapas e tarefas.

## Alterações na experiência
- Adicionar a escolha **Modalidade** no formulário “Nova Evolução”, disponível somente para administradores.
- Exibir a modalidade em cada evolução já cadastrada.
- Na evolução personalizada, mostrar controles para adicionar e excluir etapas.
- Manter o cadastro, edição e exclusão de tarefas dentro de cada etapa exclusivamente para administradores.
- Na evolução padrão, carregar as mesmas etapas, tarefas, pesos e distribuição de datas usados pelo Projeto Padrão quando houver início e término.
- Preservar a visualização e o acompanhamento para os clientes com acesso ao projeto, sem permitir alterações administrativas.

## Dados e compatibilidade
- Adicionar à evolução o campo de modalidade (`standard` ou `custom`), considerando as evoluções existentes como padrão.
- Garantir que a criação da evolução e de seu conteúdo mantenha integridade: se etapas ou tarefas padrão falharem, remover a evolução incompleta.
- Manter as regras atuais de acesso por projeto e de administração.

## Validação
- Conferir a criação de uma evolução padrão com todas as cinco etapas e suas tarefas.
- Conferir a criação de uma evolução personalizada vazia e o cadastro/exclusão de etapas e tarefas.
- Validar a visualização do cliente sem controles administrativos.
- Executar verificação de tipos, testes automatizados e conferir a tela em uso.
