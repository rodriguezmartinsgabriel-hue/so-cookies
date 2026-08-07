# AGENTS.md

## Git workflow
- **Sempre 1 commit por mudança completa.** Incluir todos os arquivos relacionados
  (código, testes, configs) no MESMO commit — nunca commitar estados intermediários
  que deixem o código inconsistente ou quebrem CI/build/testes.
- Rodar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` antes de commitar.
- Padrão de mensagem: `tipo(escopo): descrição` em pt-BR (ex.: `fix(oauth): ...`).
- `git push` somente depois que o commit está verde e o working tree limpo.

## Pricing — tiers de cookies assados

Os descontos por volume dos cookies assados são **dados reais** persistidos em
`PriceTier` no banco, ativados pela flag `PricingSettings.activatePriceTier`.

Tabela atual (oficial):

| Faixa      | Preço/un |
| ---------- | -------- |
| 1–2 un     | R$ 15,00 |
| 3–9 un     | R$ 13,00 |
| 10+ un     | R$ 10,00 |

### Como aplicar / corrigir tiers

`prisma/seed-price-tiers.ts` é o script idempotente que:

1. Detecta produtos assados via `Product.sku` começando com `CK-` e não
   terminando com `-FZ`, OU `Product.category` em `{"Cookie", "Assados"}`.
2. Faz upsert dos 3 tiers oficiais por produto.
3. Desativa tiers órfãos `Congelado Xun` atrelados a produtos assados.
4. Garante `PricingSettings.activatePriceTier = true` sem mexer nas outras
   flags.

Rodar contra produção:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npx tsx prisma/seed-price-tiers.ts
```

Pode ser re-executado quantas vezes quiser — é idempotente.

### Como testar

Após aplicar, validar que o `PricingEngine` retorna os preços corretos:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
# (script de teste ad-hoc via npx tsx, ver git log "test(pricing)")
```
