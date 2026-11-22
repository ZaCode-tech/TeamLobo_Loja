# Loja Team Lobo — guia rápido

## Onde fica cada coisa
| Lugar | O que fica lá |
|---|---|
| **GitHub** (site público) | `index.html`, `style.css`, `app.js`, `config.js`, `produtos.js`, `vendor/`, `assets/` |
| **Planilha Google** | abas **Produtos** e **Pedidos** + o código `Code.gs` (em Extensões > Apps Script) |
| **Gmail / Drive** | e-mails de aviso e comprovante; fotos dos produtos |

> `Code.gs` **nunca** vai para o GitHub, e `config.js` **nunca** leva o conteúdo do `Code.gs`.
> O `config.js` correto começa com `window.LOJA = {`.

## Atualizar o Code.gs (faça uma vez)
1. Na planilha: **Extensões > Apps Script**. Apague tudo e cole o `Code.gs` novo. Salve.
2. Selecione a função **setup** e clique em **Executar**. Autorize (Drive e Gmail).
3. **Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar.** A URL continua a mesma.
   Sem esse passo, o site continua usando o código antigo.
4. Feche e abra a planilha: aparece o menu **🐺 Loja Team Lobo**.

## Dia a dia (sem mexer em código)
- **Mudar preço:** aba **Produtos**, coluna `preco (R$)`. Recarregue o site.
- **Adicionar produto:** menu **🐺 Loja Team Lobo > ➕ Adicionar produto** (nome, preço, tamanhos, cores e fotos).
  As fotos vão para uma pasta do seu Drive e aparecem na loja.
- **Esconder produto:** coluna `ativo` = `nao`. **Marcar novidade:** coluna `novo` = `sim`.
- **Confirmar pagamento:** pelo botão do e-mail do pedido, ou pelo menu **✅ Confirmar pagamento (manual)** (digite o código TL-XXXXXX).

## Por que mudar o preço no produtos.js não funcionava
Com a planilha ligada (`endpoint` preenchido no `config.js`), **os preços vêm da planilha**. O `produtos.js` é só uma reserva.
Além disso, o GitHub Pages guarda arquivos em cache por alguns minutos.
Para saber de onde vêm os preços, abra a loja com `?debug` no final do endereço: um aviso mostra a fonte.

## Pix automático (resumo)
O site não consegue "conversar com o app do banco". Para confirmar sozinho, o Pix precisa ser **cobrança dinâmica**
criada por um **provedor de Pix** (um banco com API Pix para empresas, ou Mercado Pago, Asaas, Woovi, Efí etc.).
Quando o cliente paga, o provedor avisa o `Code.gs` (webhook) e o comprovante sai sozinho.
O modo manual continua como reserva. Para implementar, preciso saber qual banco ou provedor você quer usar.
