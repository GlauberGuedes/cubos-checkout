const express = require("express");
const { listarEFiltrarProdutos, mostrarCarrinho, postarCarrinho, alterarProduto, deletarProduto, deletarTodoOCarrinho, finalizarCompra } = require("./controladores/produtos");
const roteador = express();

roteador.get("/produtos", listarEFiltrarProdutos);
roteador.get("/carrinho", mostrarCarrinho);
roteador.post("/carrinho/produtos", postarCarrinho);
roteador.patch("/carrinho/produtos/:idProduto", alterarProduto);
roteador.delete("/carrinho/produtos/:idProduto", deletarProduto);
roteador.delete("/carrinho", deletarTodoOCarrinho);
roteador.post("/finalizar-compra", finalizarCompra);

module.exports = roteador;
