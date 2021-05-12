const fs = require("fs/promises");
const axios = require("axios");

async function todosProdutosComEstoque () {
    const listaJson = JSON.parse(await fs.readFile("data.json"));
    const produtosComEstoque = listaJson.produtos.filter(produto => produto.estoque > 0);

    return produtosComEstoque;
}

async function lerCarrinho () {
   return JSON.parse(await fs.readFile("carrinho.json"));
}

async function atualizarCarrinho (carrinho) {
    await fs.writeFile("carrinho.json", JSON.stringify(carrinho, null, 2));
    return;
}

async function lerEstoque () {
    return JSON.parse(await fs.readFile("data.json"));
}

async function atualizarEstoque (estoque) {
    await fs.writeFile("data.json", JSON.stringify(estoque, null, 2));
    return;
}

function carrinhoVazio () {   
    return {produtos: [],
        subtotal: 0,
        dataDeEntrega: null,
        valorDoFrete: 0,
        totalAPagar: 0
    }
}

async function esvaziarCarrinho (carrinho) {
    carrinho.subtotal = 0;
    carrinho.dataDeEntrega = null;
    carrinho.valorDoFrete = 0;
    carrinho.totalAPagar = 0;
    carrinho.produtos = [];
    await atualizarCarrinho(carrinho);
}

function validarDados (dados) {
    if(!dados) {
        return `Precisa ser enviado os dados do cliente.`;
    }
    if(!dados.type || !dados.country || !dados.name || !dados.documents || !dados.email || !dados.phone_numbers) {
        return `Informações incompletas.`;
    }
    if(dados.type !== "individual") {
        return `Type precisa ser 'individual' (este e-commerce só atende pessoas físicas)`;
    }
    if(dados.country.length !== 2) {
        return `O campo country precisa ter 2 digitos`;
    }
    if(!dados.name.trim()) {
        return `O nome não deve ser espaços vazios.`;
    }
    if(typeof dados.name !== "string") {
        return `O nome tem que ser uma string`;
    }
    if(dados.name.trim().split(" ").length < 2) {
        return `O campo name tem que ter pelo menos nome e sobrenome.`;
    }
    if(dados.documents[0].type !== "cpf") {
        return `O tipo do documento precisa ser cpf.`;
    }
    if(!Number(dados.documents[0].number) || dados.documents[0].number.includes(".")) {
        return `O número do cpf precisa conter apenas números.`;
    }
    if(dados.documents[0].number.length !== 11) {
        return `O número do cpf precisa conter 11 digitos.`;
    }
    if(!dados.email.includes("@")) {
        return `O email deve ser um email válido`;
    }
    const indice = dados.email.indexOf("@");
    if(!dados.email.includes(".", indice)) {
        return `O email deve ser um email válido`;
    }
    if(dados.phone_numbers[0].length < 13) {
        return `O telefone precisa está completo (com prefixo nacional, ddd do estado). Ex: +5571912345678`;
    }
    if(!dados.phone_numbers[0].includes("+")) {
        return `O telefone precisa está completo com o "+" do prefixo nacional.`;
    }

}

const instanciaAxios = axios.create({
    baseURL: "https://api.pagar.me/1/",
    params: {
        api_key: "ak_test_rFF3WFkcS9DRdBK7Ocw6QOzOOQEScS"
    }
});

module.exports = {lerCarrinho, atualizarCarrinho, lerEstoque, atualizarEstoque, todosProdutosComEstoque, carrinhoVazio, esvaziarCarrinho, validarDados, instanciaAxios}