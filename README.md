# Inventário

Sistema de controle de inventário, equipes e frota (Power Connect USA).

**Visão Geral** — painel com totais de itens, equipamentos, equipes e movimentações do mês
(com sparklines de dados reais), inventário resumido e movimentações recentes.

**Inventário**
- *Itens*: tabela com equipe, quantidade, preço e status (disponível, estoque baixo,
  sem estoque). Entradas, saídas e **transferências entre equipes/Yard** em um clique;
  ao retirar, oferece gerar invoice (máquina + VIN) em PDF para cobrança.
- *Equipamentos*: frota completa com categoria, modelo, ano, placa, VIN, equipe, supervisor,
  proprietário, status, observações e Verizon/Bouncie/Samsung/E-ZPass. Já no cadastro dá para
  lançar as manutenções que o equipamento teve. **Controle de troca de óleo**: informe o
  odômetro, o intervalo e a última troca — o sistema calcula a próxima, avisa quando está
  perto ou atrasada, e recalcula sozinho a cada troca registrada.
- *Equipes*: cada equipe tem dois acessos diretos — ver seus **equipamentos** e ver seus
  **itens**. Dá para transferir de lá mesmo, renomear e excluir (nada é perdido: volta para o Yard).

**Categorias** — os tipos de equipamento (Truck, Trailer, Vacuum…), com atalho para
cadastrar os padrões da frota de uma vez.

**Relatórios e Histórico**
- Histórico registra automaticamente toda entrada, saída, transferência, troca de peça,
  mudança de status, cadastro e exclusão — com data, quantidade, equipe e usuário.
- Exportação em PDF de itens, equipamentos e do histórico completo.

Também: busca global, alertas de estoque baixo, modo claro/escuro e login protegido por senha.

## Rodando localmente

```bash
npm install
npm run dev
```

Sem configurar o Supabase (veja abaixo), o app funciona normalmente salvando os dados no navegador (`localStorage`).

## Configurar o banco de dados (Supabase)

Para os dados ficarem salvos permanentemente (e acessíveis de qualquer computador), configure um projeto Supabase gratuito:

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. Em **SQL Editor**, rode o conteúdo do arquivo [`supabase-setup.sql`](./supabase-setup.sql) deste repositório.
   Rode de novo sempre que o schema mudar — o script é seguro para repetir e só cria o que falta.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Localmente: crie um arquivo `.env` (baseado em `.env.example`) com:
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```
5. No GitHub (para o deploy funcionar com banco de dados): vá em **Settings → Secrets and variables → Actions** deste repositório e crie dois secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Deploy (GitHub Pages)

O deploy é automático a cada push na branch `main`, via GitHub Actions (`.github/workflows/deploy.yml`).

Passo único necessário (uma vez só): em **Settings → Pages**, defina **Source** como **GitHub Actions**.

O site fica disponível em `https://c4iomag.github.io/Inventario-pago/` (repare no "I" maiúsculo, igual ao nome do repositório).

## Login

O acesso é único, com email e senha fixos configurados em `src/lib/auth.js`.
