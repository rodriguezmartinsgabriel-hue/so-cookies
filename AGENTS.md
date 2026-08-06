# AGENTS.md

## Git workflow
- **Sempre 1 commit por mudança completa.** Incluir todos os arquivos relacionados
  (código, testes, configs) no MESMO commit — nunca commitar estados intermediários
  que deixem o código inconsistente ou quebrem CI/build/testes.
- Rodar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` antes de commitar.
- Padrão de mensagem: `tipo(escopo): descrição` em pt-BR (ex.: `fix(oauth): ...`).
- `git push` somente depois que o commit está verde e o working tree limpo.
