# Estoque

Sistema de controle de estoque, equipes e frota (Power Connect USA).

- **Equipamentos**: crie equipes, adicione veículos/máquinas a cada uma (nome, tipo, modelo,
  ano, placa, VIN, supervisor, proprietário, Verizon/Bouncie/Samsung/E-ZPass, observações) e
  edite para redirecionar um asset para outra equipe
- **Histórico por veículo**: registre peças trocadas com data — opcionalmente descontando
  direto do estoque da equipe
- **Estoque**: por equipe (ou geral), adicionar itens, acrescentar/retirar quantidade
- Ao retirar, opção de gerar invoice (máquina + VIN) em PDF para cobrança
- Exportar o estoque completo em PDF
- Histórico de invoices, com re-download
- Modo claro/escuro
- Login único, protegido por senha

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
