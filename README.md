# Inventário

Sistema de controle de inventário, equipes e frota (Power Connect USA).

**Visão Geral** — painel com totais de itens, equipamentos, equipes e movimentações do mês
(com sparklines de dados reais), inventário resumido e movimentações recentes.

**Inventário**
- *Itens*: nome, quantidade, equipe e — só quando o item é cobrado — preço unitário.
  Entradas, saídas e **transferências entre equipes/Yard** em um clique; ao retirar,
  oferece gerar invoice (máquina + VIN) em PDF para cobrança.
- *Equipamentos*: frota completa com categoria, modelo, ano, placa, VIN, equipe, supervisor,
  proprietário, status, observações, Verizon, Bouncie, E-ZPass e **Samsung (GPS): sim ou não**. Já no cadastro dá para
  lançar as manutenções que o equipamento teve. Cada tipo de manutenção pede os campos certos:
  **troca de óleo** (tipo de óleo, litros, filtros), **troca de pneus** (posições, marca,
  medida, alinhamento), **troca de peças** (part number, marca, fornecedor, garantia) e revisão.
  **Controle de troca de óleo**: informe o odômetro, o intervalo e a última troca — o sistema
  calcula a próxima, avisa quando está perto ou atrasada, e recalcula a cada troca registrada.
  Cada equipamento tem ainda uma área de **documentos por categoria** — DOT, Registration,
  Seguro, Fotos e Documentos — aceitando fotos, PDF, Word e planilhas (fotos viram
  miniaturas com visualizador).
- *Manutenção*: área própria da oficina. Escreva o veículo (se ainda não estiver cadastrado,
  ele é criado na hora), diga se está **em manutenção** ou **pronto**, e descreva em
  **campo aberto** o que foi feito — as peças usadas são um campo à parte e opcional.
  As abas separam o que está parado do que já está pronto, com busca por veículo, serviço,
  peça ou mecânico. Ao abrir uma manutenção o equipamento passa para o status "Manutenção";
  ao concluir (com data, complemento do serviço e custo) ele volta para "Disponível".
  Todo registro fica no histórico do equipamento e pode ser editado, reaberto ou excluído.
- *Equipes e supervisores*: a página tem duas seções. **Equipes** são os grupos de trabalho e
  **Supervisores** são pessoas que também respondem por equipamentos — funcionam igual (guardam
  frota e estoque, recebem transferências), só aparecem separados nas listas e seletores.
  Cada um tem **nome e código do sistema** (ex.: `Caio · PC-038`) — o código
  é opcional, aparece junto do nome em todo o app e também serve para casar as equipes ao
  importar planilhas e PDFs ("Equipe Caio", "PC-038" e "Caio · PC-038" são a mesma equipe).
  Clicar no card abre o painel com dois acessos — ver seus **equipamentos** e ver
  seus **itens**. Dá para transferir de lá mesmo, editar nome e supervisor, e excluir
  (nada é perdido: volta para o Yard). Buscar o nome da equipe no topo abre o painel direto.

**Documentos** — envie PDFs, planilhas e fotos (arraste ou clique) e **leia os dados** deles
direto para o sistema:

- *Planilhas (.xlsx/.csv)*: o cabeçalho é encontrado sozinho mesmo quando a planilha tem
  título ou linhas em branco no topo (e dá para escolher a linha e a aba na mão). São
  reconhecidas colunas em português e inglês — código/unit, tipo, modelo/make, ano, placa,
  **VIN/chassi/serial**, equipe, supervisor, motorista/driver, cidade, estado, proprietário,
  status, odômetro/hourmeter,
  intervalo e última troca de óleo, Verizon, Bouncie, Samsung e E-ZPass. **Nenhuma coluna se
  perde**: as que o sistema não conhece são guardadas em Observações no formato `Coluna: valor`.
  Importar de novo **completa** os equipamentos que já existem com os campos que estavam
  vazios, sem apagar nada.
- *Prioridade no reconhecimento*: um cabeçalho que é o **próprio nome** do campo ganha de um
  sinônimo. Numa planilha com `Driver` e `Supervisor`, cada um vai para o seu campo — antes o
  Supervisor ficava com a coluna Driver (sinônimo dele) e a coluna Supervisor sobrava.
  `N/A`, `-` e `none` são lidos como vazio, e linhas de resumo (`(sem equipe)`, `Total`) não
  viram equipe.
- *Supervisores a partir da planilha de frota*: quando a linha não tem equipe, o supervisor dela
  é cadastrado como **supervisor** e o equipamento fica com ele. Nomes de pátio
  (`Yard Apopka FL`) são reconhecidos como pátio e continuam no Yard. Na importação de equipes,
  os nomes da coluna Supervisor também podem virar cadastro.
- *Conferir / corrigir colunas*: a importação mostra cada coluna do arquivo, um exemplo do
  conteúdo dela e para onde ela está indo — e deixa **apontar na mão** o campo certo, mandar a
  coluna para Observações ou ignorá-la. Serve para qualquer cabeçalho fora do padrão
  (`COD ATIVO`, `CHASSI 17`, `LICENCA`…), inclusive quando o sistema não achou nenhuma coluna.
  Células mescladas no cabeçalho também são lidas.
- *PDFs*: o mesmo arquivo é lido de dois jeitos, escolhidos em abas.
  - **Documento de um veículo** (ficha do equipamento, registration, título, seguro, inspeção):
    reconhece unidade, VIN (inclusive escrito com espaços), placa, ano, modelo, proprietário,
    supervisor, equipe, odômetro, **Verizon, Bouncie, Samsung (GPS) e E-ZPass**, além de
    validade e apólice — você confere na tela e escolhe em qual equipamento gravar (só entram
    os campos ainda vazios; a equipe citada é criada se não existir).
  - **Lista / tabela** (a frota inteira, ou as equipes, num PDF só): as colunas são deduzidas
    pelos corredores de espaço em branco da página, e daí em diante vale tudo o que a planilha
    tem — cabeçalho automático, mesmos nomes de coluna, colunas extras em Observações.
    Um título de grupo no meio da lista (ex.: `EQUIPE CAIO — PC-038`) é entendido como a
    equipe dos equipamentos listados abaixo dele.

  O texto extraído pode ser visto por inteiro. PDFs digitalizados (imagem pura) não têm texto
  para ler e avisam isso.
- *Equipes em lote*: além de equipamentos e itens, a importação tem o modo **Equipes** — cria
  as equipes com nome, código e supervisor. Ao importar equipamentos, as equipes citadas que
  ainda não existirem podem ser criadas junto (`Equipe Caio, PC-038` vira a equipe
  `Caio · PC-038`), e nada é sobrescrito no que já estava cadastrado.

**Categorias** — os tipos de equipamento (Truck, Trailer, Vacuum…), com atalho para
cadastrar os padrões da frota de uma vez.

**Relatórios e Histórico**
- Histórico mostra as **transferências** por padrão, com o **motivo de cada uma**
  (ex.: "veio para o Yard Apopka pois estava quebrada") — a observação pode ser escrita na
  hora da transferência ou adicionada depois.
- Exportação em PDF de itens, equipamentos e do histórico.

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
