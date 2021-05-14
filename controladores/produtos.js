const fs = require("fs/promises");
const { addBusinessDays, format } = require("date-fns");
const axios = require("axios");
const {
  lerCarrinho,
  atualizarCarrinho,
  lerEstoque,
  atualizarEstoque,
  todosProdutosComEstoque,
  carrinhoVazio,
  esvaziarCarrinho,
  validarDados,
  instanciaAxios,
} = require("./funcoes-apoio");

async function listarEFiltrarProdutos(req, res) {
  const produtos = await todosProdutosComEstoque();
  const categoria = req.query.categoria;
  const precoInicial = req.query.precoInicial;
  const precoFinal = req.query.precoFinal;

  if (!categoria && !precoInicial && !precoFinal) {
    return res.status(200).json(produtos);
  }

  if (precoInicial && precoFinal && categoria) {
    const categoriaFormatado = categoria[0].toUpperCase() + categoria.slice(1);
    const produtoFiltradoPorPrecoECategoria = produtos.filter(
      (produto) =>
        produto.preco >= Number(precoInicial) &&
        produto.preco <= Number(precoFinal) &&
        produto.categoria === categoriaFormatado
    );
    return res.status(200).json(produtoFiltradoPorPrecoECategoria);
  }

  if (precoInicial && precoFinal) {
    const produtoFiltradoPorPreco = produtos.filter(
      (produto) =>
        produto.preco >= Number(precoInicial) &&
        produto.preco <= Number(precoFinal)
    );
    return res.status(200).json(produtoFiltradoPorPreco);
  }

  if (precoInicial && categoria) {
    const categoriaFormatado = categoria[0].toUpperCase() + categoria.slice(1);
    const produtoFiltradoPorPrecoInicialECategoria = produtos.filter(
      (produto) =>
        produto.preco >= Number(precoInicial) &&
        produto.categoria === categoriaFormatado
    );
    return res.status(200).json(produtoFiltradoPorPrecoInicialECategoria);
  }

  if (precoFinal && categoria) {
    const categoriaFormatado = categoria[0].toUpperCase() + categoria.slice(1);
    const produtoFiltradoPorPrecoFinalECategoria = produtos.filter(
      (produto) =>
        produto.preco <= Number(precoFinal) &&
        produto.categoria === categoriaFormatado
    );
    return res.status(200).json(produtoFiltradoPorPrecoFinalECategoria);
  }

  if (precoInicial) {
    const produtoFiltradoPorPrecoInicial = produtos.filter(
      (produto) => produto.preco >= Number(precoInicial)
    );
    return res.status(200).json(produtoFiltradoPorPrecoInicial);
  }

  if (precoFinal) {
    const produtoFiltradoPorPrecoFinal = produtos.filter(
      (produto) => produto.preco <= Number(precoFinal)
    );
    return res.status(200).json(produtoFiltradoPorPrecoFinal);
  }

  if (categoria) {
    const categoriaFormatado = categoria[0].toUpperCase() + categoria.slice(1);
    const produtoFiltradoPorCategoria = produtos.filter(
      (produto) => produto.categoria === categoriaFormatado
    );
    return res.status(200).json(produtoFiltradoPorCategoria);
  }
}

async function mostrarCarrinho(req, res) {
  const carrinho = JSON.parse(await fs.readFile("carrinho.json"));

  if (carrinho.produtos.length > 0) {
    return res.json(carrinho);
  }

  res.json(carrinhoVazio());
}

async function postarCarrinho(req, res) {
  const pedido = req.body;

  if (
    !pedido.id ||
    !pedido.quantidade ||
    typeof pedido.id !== "number" ||
    typeof pedido.quantidade !== "number" ||
    pedido.quantidade <= 0
  ) {
    return res
      .status(404)
      .json({
        mensagem:
          "É preciso passar id e quantidade do produto. Sendo eles em número.",
      });
  }

  const listaJSON = JSON.parse(await fs.readFile("data.json"));
  const listaProduto = listaJSON.produtos;
  const produto = listaProduto.find((produto) => produto.id === pedido.id);

  if (!produto) {
    return res.status(404).json({ mensagem: "Esse produto não existe!" });
  }

  const carrinho = await lerCarrinho();

  const temProdutoNoCarrinho = carrinho.produtos.find(
    (produtoDoCarrinho) => produtoDoCarrinho.id === pedido.id
  );

  if (temProdutoNoCarrinho) {
    if (temProdutoNoCarrinho.quantidade + pedido.quantidade > produto.estoque) {
      return res
        .status(404)
        .json({ mensagem: "Esse produto não tem estoque suficiente!" });
    }

    temProdutoNoCarrinho.quantidade =
      temProdutoNoCarrinho.quantidade + pedido.quantidade;

    const momento = new Date();

    carrinho.subtotal = carrinho.subtotal + pedido.quantidade * produto.preco;
    carrinho.dataDeEntrega = addBusinessDays(momento, 15);
    carrinho.valorDoFrete = carrinho.subtotal < 20000 ? 5000 : 0;
    carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
    carrinho.produtos = carrinho.produtos;

    await atualizarCarrinho(carrinho);

    return res.status(201).json(carrinho);
  }

  if (produto.estoque < pedido.quantidade) {
    return res
      .status(404)
      .json({ mensagem: "Esse produto não tem estoque suficiente!" });
  }

  const momento = new Date();

  carrinho.subtotal = carrinho.subtotal + pedido.quantidade * produto.preco;
  carrinho.dataDeEntrega = addBusinessDays(momento, 15);
  carrinho.valorDoFrete = carrinho.subtotal < 20000 ? 5000 : 0;
  carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
  carrinho.produtos.push({
    id: produto.id,
    quantidade: pedido.quantidade,
    nome: produto.nome,
    preco: produto.preco,
    categoria: produto.categoria,
  });

  await atualizarCarrinho(carrinho);

  return res.status(201).json(carrinho);
}

async function alterarProduto(req, res) {
  const id = req.params.idProduto;
  const quantidade = req.body.quantidade;

  const carrinho = await lerCarrinho();
  const produtoDoCarrinho = carrinho.produtos.find(
    (produto) => produto.id === Number(id)
  );

  if (!produtoDoCarrinho) {
    return res
      .status(404)
      .json({ mensagem: "Este produto não está no carrinho." });
  }

  if (typeof quantidade !== "number") {
    return res.status(400).json({ mensagem: "Quantidade deve ser um número." });
  }

  const produtosComEstoque = await todosProdutosComEstoque();
  const informacaoDoProdutoNoEstoque = produtosComEstoque.find(
    (produto) => produto.id === Number(id)
  );

  if (
    produtoDoCarrinho.quantidade + quantidade >
    informacaoDoProdutoNoEstoque.estoque
  ) {
    return res
      .status(404)
      .json({ mensagem: "Esse produto não tem estoque suficiente!" });
  }

  if (produtoDoCarrinho.quantidade + quantidade < 0) {
    return res.status(404).json({
      mensagem:
        "Essa quantidade é maior que a quantidade do produto no carrinho.",
    });
  }

  const momento = new Date();

  produtoDoCarrinho.quantidade = produtoDoCarrinho.quantidade + quantidade;
  carrinho.subtotal = carrinho.subtotal + quantidade * produtoDoCarrinho.preco;
  carrinho.valorDoFrete = carrinho.subtotal < 20000 ? 5000 : 0;
  carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
  carrinho.dataDeEntrega = addBusinessDays(momento, 15);

  const indiceProduto = carrinho.produtos.indexOf(produtoDoCarrinho);

  if (produtoDoCarrinho.quantidade === 0) {
    carrinho.produtos.splice(indiceProduto, 1);
  }

  await atualizarCarrinho(carrinho);

  if (carrinho.produtos.length === 0) {
    return res.status(200).json(carrinhoVazio());
  }

  res.status(200).json(carrinho);
}

async function deletarProduto(req, res) {
  const id = req.params.idProduto;

  const carrinho = await lerCarrinho();
  const produtoDoCarrinho = carrinho.produtos.find(
    (produto) => produto.id === Number(id)
  );

  if (!produtoDoCarrinho) {
    return res
      .status(404)
      .json({ mensagem: "Este produto não está no carrinho." });
  }

  const indiceProduto = carrinho.produtos.indexOf(produtoDoCarrinho);

  const momento = new Date();

  carrinho.subtotal =
    carrinho.subtotal - produtoDoCarrinho.quantidade * produtoDoCarrinho.preco;
  carrinho.valorDoFrete = carrinho.subtotal < 20000 ? 5000 : 0;
  carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
  carrinho.dataDeEntrega = addBusinessDays(momento, 15);

  carrinho.produtos.splice(indiceProduto, 1);

  await atualizarCarrinho(carrinho);

  if (carrinho.produtos.length === 0) {
    return res.status(200).json(carrinhoVazio());
  }

  res.status(200).json(carrinho);
}

async function deletarTodoOCarrinho(req, res) {
  const carrinho = await lerCarrinho();
  esvaziarCarrinho(carrinho);

  res.json({ mensagem: "Operação realizada com sucesso." });
}

async function finalizarCompra(req, res) {
  const carrinho = await lerCarrinho();

  if (carrinho.produtos.length === 0) {
    return res.status(404).json({ mensagem: "Não há produtos no carrinho." });
  }

  const estoque = await lerEstoque();
  const produtosEstoque = estoque.produtos;

  for (const produtoDoCarrinho of carrinho.produtos) {
    const produtoDoEstoque = produtosEstoque.find(
      (produto) => produto.id === produtoDoCarrinho.id
    );
    if (produtoDoEstoque.estoque < produtoDoCarrinho.quantidade) {
      return res.status(404).json({
        mensagem: `Não há estoque para o produto: ${produtoDoCarrinho}.`,
      });
    }
  }

  const dados = req.body;
  const error = validarDados(dados);

  if (error) {
    return res.status(404).json({ mensagem: error });
  }

  for (const produtoDoCarrinho of carrinho.produtos) {
    const produtoDoEstoque = produtosEstoque.find(
      (produto) => produto.id === produtoDoCarrinho.id
    );
    produtoDoEstoque.estoque =
      produtoDoEstoque.estoque - produtoDoCarrinho.quantidade;
  }

  const data = new Date();
  const dataVencimento = format(addBusinessDays(data, 3), "yyyy-MM-dd");

  const cupom = req.query.cupom;
  let desconto = 0;

  if (cupom) {
    if (!Number(cupom)) {
      res.status(404).json({ mensagem: "cupom deve ser um número." });
      return;
    }
    if (Number(cupom) > 30) {
      res.status(404).json({ mensagem: "cupom não pode ser maior que 30." });
      return;
    }
    carrinho.cupomDeDesconto = `${cupom} %`;
    desconto = ((carrinho.totalAPagar * Number(cupom)) / 100).toFixed(0);
    carrinho.totalAPagar = carrinho.totalAPagar - desconto;
  }

  const bodyPagarme = {
    amount: carrinho.totalAPagar,
    payment_method: "boleto",
    boleto_expiration_date: dataVencimento,
    customer: {
      external_id: "1",
      name: dados.name,
      type: dados.type,
      country: dados.country,
      email: dados.email,
      documents: [
        {
          type: dados.documents[0].type,
          number: dados.documents[0].number,
        },
      ],
      phone_numbers: dados.phone_numbers,
    },
  };

  try {
    const pedido = await instanciaAxios.post("transactions", bodyPagarme);

    const listaVendas = JSON.parse(await fs.readFile("vendas.json"));

    const venda = {
      id: pedido.data.acquirer_id,
      dataDaVenda: data,
      valorDaVenda: carrinho.subtotal,
      valorDoFrete: carrinho.valorDoFrete,
      cupomUtilizado: carrinho.cupomDeDesconto,
      valorTotal: carrinho.totalAPagar,
      produtosVendidos: carrinho.produtos,
      linkBoleto: pedido.data.boleto_url,
    };

    listaVendas.push(venda);

    await fs.writeFile("vendas.json", JSON.stringify(listaVendas, null, 2));

    await atualizarEstoque(estoque);
    await esvaziarCarrinho(carrinho);

    return res.json({
      tipo: `${pedido.data.payment_method}`,
      boleto: `${pedido.data.boleto_url}`,
      desconto: `R$ ${desconto / 100}`,
      valor: `R$ ${pedido.data.amount / 100}`,
      Vencimento: `${format(
        new Date(pedido.data.boleto_expiration_date),
        "dd-MM-yyyy"
      )}`,
    });
  } catch (error) {
    return res.status(404).json(error);
  }
}

async function listarEFiltrarVendas(req, res) {
  const listaVendas = JSON.parse(await fs.readFile("vendas.json"));

  const categoria = req.query.categoria;
  const produto = req.query.produto;
  const dataInicial = req.query.datainicial;
  const dataFinal = req.query.datafinal;
  let valor = 0;
  let quantidade = 0;
  let nome = "";
  const produtoFiltrado = [];

  if (categoria) {
    const categoriaFormatado = categoria[0].toUpperCase() + categoria.slice(1);

    for (const venda of listaVendas) {
      const filtroCategoria = venda.produtosVendidos.filter(
        (produtoVendido) => produtoVendido.categoria === categoriaFormatado
      );
      produtoFiltrado.push(filtroCategoria);
    }
    for (const informacoesProdutoFiltrado of produtoFiltrado.flat()) {
      valor +=
        informacoesProdutoFiltrado.quantidade *
        informacoesProdutoFiltrado.preco;
      quantidade += informacoesProdutoFiltrado.quantidade;
    }
    const resposta = {
      relatorioCategoria: {
        categoria: categoriaFormatado,
        quantidadeVendida: quantidade,
        valorAcumuladoEmVendas: valor,
      },
    };
    res.json(resposta);
    return;
  }

  if (produto) {
    if (!Number(produto)) {
      res
        .status(400)
        .json({ mensagem: "O id do produto informado precisa ser um número" });
      return;
    }
    const idProduto = Number(produto);
    for (const venda of listaVendas) {
      const filtroProduto = venda.produtosVendidos.filter(
        (produtoVendido) => produtoVendido.id === idProduto
      );
      produtoFiltrado.push(filtroProduto);
    }
    for (const informacoesProdutoFiltrado of produtoFiltrado.flat()) {
      valor +=
        informacoesProdutoFiltrado.quantidade *
        informacoesProdutoFiltrado.preco;
      quantidade += informacoesProdutoFiltrado.quantidade;
      nome = informacoesProdutoFiltrado.nome;
    }
    const resposta = {
      relatorioProduto: {
        id: idProduto,
        produto: nome,
        quantidadeVendida: quantidade,
        valorAcumuladoEmVendas: valor,
      },
    };
    res.json(resposta);
    return;
  }

  if (dataInicial && dataFinal) {
    const dataInicialFormatada = new Date(dataInicial);
    const dataFinalFormatada = new Date(dataFinal);

    if (!dataFinalFormatada || !dataInicialFormatada) {
      res.status(400).json({
        mensagem:
          "A data tem que vim no formato correto. EX: 2021-05-04T01:18:58.422Z",
      });
      return;
    }

    for (const venda of listaVendas) {
      if (
        new Date(venda.dataDaVenda).getTime() >
          dataInicialFormatada.getTime() &&
        new Date(venda.dataDaVenda).getTime() < dataFinalFormatada.getTime()
      ) {
        produtoFiltrado.push(venda);
      }
    }
    res.json(produtoFiltrado);
    return;
  }

  if (dataInicial && !dataFinal) {
    const dataInicialFormatada = new Date(dataInicial);

    if (!dataInicialFormatada) {
      res.status(400).json({
        mensagem:
          "A data tem que vim no formato correto. EX: 2021-05-04T01:18:58.422Z",
      });
      return;
    }

    for (const venda of listaVendas) {
      if (+new Date(venda.dataDaVenda) > +dataInicialFormatada) {
        produtoFiltrado.push(venda);
      }
    }
    res.json(produtoFiltrado);
    return;
  }

  if (!dataInicial && dataFinal) {
    const dataFinalFormatada = new Date(dataFinal);

    if (!dataFinalFormatada) {
      res.status(400).json({
        mensagem:
          "A data tem que vim no formato correto. EX: 2021-05-04T01:18:58.422Z",
      });
      return;
    }

    for (const venda of listaVendas) {
      if (+new Date(venda.dataDaVenda) < +dataFinalFormatada) {
        produtoFiltrado.push(venda);
      }
    }
    res.json(produtoFiltrado);
    return;
  }

  res.json(listaVendas);
}

module.exports = {
  listarEFiltrarProdutos,
  mostrarCarrinho,
  postarCarrinho,
  alterarProduto,
  deletarProduto,
  deletarTodoOCarrinho,
  finalizarCompra,
  listarEFiltrarVendas,
};
