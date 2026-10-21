# Produtividade Ponderada

Sistema de acompanhamento dos gestores: carteira de clientes, registro de 1:1, demandas com SLA e produtividade ponderada por pontos.

Feito com **Next.js** (telas) e **Supabase** (login, banco de dados e regras de acesso). Publica na **Vercel**. Os três têm plano gratuito.

## Perfis de acesso

| Perfil | O que vê | O que pode fazer |
|---|---|---|
| Coordenador | Tudo | Tudo: faz os 1:1, demandas, clientes, gestores, prioridades, usuários. Pode haver vários. |
| Gestor | Só os próprios dados (carteira, 1:1, demandas) | Marcar ou desfazer a conclusão das próprias demandas. Entra com código enviado por e-mail. |
| Liderança | Tudo | Só visualizar |
| Aguardando liberação | Nada | Esperar o administrador definir o perfil |

**A primeira pessoa que criar conta vira Coordenador automaticamente.** Os outros coordenadores você promove na tela Usuários. Crie a sua antes de passar o link para os outros.

## 1. Criar o banco no Supabase

1. Crie uma conta em https://supabase.com e clique em **New project**. Anote a senha do banco.
2. No projeto, abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as tabelas, as regras de acesso e os 14 gestores iniciais.
3. Em **Project Settings → API**, copie:
   - **Project URL**
   - **anon public** key

## 2. Rodar no computador (opcional)

Precisa do Node.js 18 ou mais novo.

```bash
cp .env.example .env.local   # cole a URL e a chave anon nele
npm install
npm run dev                  # abre em http://localhost:3000
```

## 3. Publicar na Vercel

1. Suba esta pasta (`sistema`) para um repositório no GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório. A Vercel detecta Next.js sozinha.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
4. Clique em **Deploy**. Anote o endereço gerado (ex.: `https://produtividade-ponderada.vercel.app`).

## 4. Ajustar o login no Supabase

Em **Authentication → URL Configuration**:

- **Site URL**: o endereço da Vercel.
- **Redirect URLs**: adicione `https://SEU-ENDERECO.vercel.app/auth/callback` (e `http://localhost:3000/auth/callback` se for rodar localmente).

Confirmação de e-mail (**Authentication → Providers → Email → Confirm email**):

- **Ligada** (padrão): quem cria conta recebe um link para confirmar. O plano gratuito do Supabase manda poucos e-mails por hora.
- **Desligada**: a conta já entra direto. Como todo novo usuário fica "Aguardando liberação" até você aprovar, isso continua seguro.

## 5. Primeiro acesso

1. Abra o endereço, clique em **Criar conta** e cadastre-se. Você vira Coordenador.
2. Em **Configurações**, ajuste a lista de gestores e as prioridades (SLA e pontos), se precisar.
3. Passe o link para gestores e liderança. Depois que eles criarem conta, abra **Usuários** e defina o perfil de cada um (Coordenador, Gestor ou Liderança). Para gestores, escolha também a qual gestor a conta pertence.

## Acesso dos gestores

1. Em **Configurações → Gestores**, preencha o e-mail ao lado do nome do gestor e clique em **Salvar**.
2. Mande o link do sistema. O gestor digita o e-mail, clica em **Receber código** e digita o código de 6 dígitos que chega.
3. No primeiro acesso ele já entra como gestor, vinculado ao próprio cadastro. Não é preciso liberar em Usuários.

Os códigos são enviados pelo Gmail configurado no Supabase (Authentication → Emails → SMTP).

## Como usar

- **+ Registrar 1:1** (topo da tela): escolha o gestor, a data, escreva resumo, pontos de atenção e combinados, e adicione as demandas levantadas. Cliente digitado que ainda não existe entra automaticamente na carteira do gestor.
- **Painel**: semana atual com produtividade, pontos, tabela por gestor, evolução de 8 semanas, mapa gestor × semana e lista de atrasadas.
- **Gestores**: um cartão por gestor com a evolução. Ao abrir, você vê o gráfico de 12 semanas, o último 1:1, a carteira, as demandas em aberto e o histórico de 1:1.
- **Demandas**: lista completa com filtros e **Baixar CSV** (abre no Excel).

## Regras de cálculo

- **Prazo** = data da demanda + SLA da prioridade (dias corridos).
- **Pontos conquistados** = pontos da prioridade, só se concluída até o prazo.
- **Produtividade** = conquistados ÷ possíveis. Verde ≥ 80%, amarelo 50–79%, vermelho < 50%.
- **Semana**: segunda a domingo, contada no mês da sexta-feira.
- **1:1**: verde até 7 dias, amarelo até 14, vermelho acima disso.

## Estrutura

```
app/            telas (login, painel, gestores, demandas, configurações, usuários, conta)
components/     menu, gráficos, formulários e carregamento de dados
lib/calc.ts     regras de SLA, pontos e semanas
supabase/       schema.sql com tabelas e regras de acesso (RLS)
middleware.ts   exige login em todas as páginas
```
