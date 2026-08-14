# Inventário

Sistema de controle de inventário, equipes e frota (Power Connect USA).

**Visão Geral** — painel com totais de itens, equipamentos, equipes e movimentações do mês
(com sparklines de dados reais), inventário resumido e movimentações recentes.

**Inventário**
- *Itens*: tabela com categoria, equipe, quantidade, preço e status (disponível, estoque baixo,
  sem estoque, manutenção). Entradas e saídas em um clique; ao retirar, oferece gerar invoice
  (máquina + VIN) em PDF para cobrança.
- *Equipamentos*: frota completa com tipo, modelo, ano, placa, VIN, equipe, supervisor,
  proprietário, status, local, marca, categoria, observações e Verizon/Bouncie/Samsung/E-ZPass.
  Cada equipamento tem página própria com histórico de peças trocadas e suas movimentações.
- *Equipes*: agrupam equipamentos e estoque. Clicar abre um painel com tudo sob a
  responsabilidade da equipe. Dá para renomear e excluir (nada é perdido: volta para "Sem equipe").

**Cadastros** — categorias, fornecedores, marcas e locais, com contagem de uso.

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
