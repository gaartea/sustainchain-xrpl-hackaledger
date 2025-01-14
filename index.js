// Importa o framework Express para criar o servidor web
var express = require('express');
var app = express();

// Importa o body-parser para tratar dados JSON nas requisições
const bodyParser = require('body-parser');
app.use(bodyParser.json()); // Configura o body-parser para processar requisições com JSON

// Importa o CORS para permitir requisições de diferentes origens
const cors = require('cors');
app.use(cors()); // Permite chamadas CORS para o servidor

// Importa o Web3.js para interagir com a blockchain Ethereum
const { Web3 } = require('web3');

// Carrega variáveis de ambiente do arquivo .env
require("dotenv").config();

console.log(process.env.SIGNER_PRIVATE_KEY);
// Importa o ABI e o endereço do contrato inteligente
const CONTACT_ABI = require('./config').CONTACT_ABI; // ABI do contrato inteligente
const CONTACT_ADDRESS = require('./config').CONTACT_ADDRESS; // Endereço do contrato inteligente

// Rota GET para obter o preço de um token específico
app.get('/token/price', async function(req, res) {
    // Conecta à rede Ethereum Sepolia via Infura
    var web3 = new Web3('https://sepolia.infura.io/v3/bece4d2938c34137ab9a21b7fe61de4e');
    
    // Cria uma instância do contrato inteligente usando o ABI e o endereço
    var contratoInteligente = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
    
    // Obtém o tokenId da query string da requisição
    let tokenId = req.query.tokenId;
    
    try {
        // Chama o método 'tokenPrices' do contrato inteligente para obter o preço do token
        let price = await contratoInteligente.methods.tokenPrices(tokenId).call();
        
        // Retorna o preço convertido de Wei para Ether como resposta JSON
        res.json({ tokenId, price: web3.utils.fromWei(price, 'ether') });
    } catch (error) {
        // Em caso de erro, retorna uma mensagem de erro
        console.error(error);
        res.status(500).send("Erro ao obter preço do token");
    }
});

// Rota POST para criar (mintar) um novo token
app.post('/token/mint', async function(req, res) {
    // Recebe os dados do token (to, tokenId e imageIndex) do corpo da requisição
    let { to, tokenId, imageIndex } = req.body;
    
    // Define a rede Ethereum a ser utilizada (Sepolia neste caso)
    const network = process.env.ETHEREUM_NETWORK;

    // Conecta ao provedor Ethereum usando Infura
    const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`));

    // Cria um objeto para assinar transações usando a chave privada do ambiente
    const signer = web3.eth.accounts.privateKeyToAccount(process.env.SIGNER_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(signer); // Adiciona a conta de assinatura ao wallet do Web3

    // Cria uma instância do contrato inteligente
    var contratoInteligente = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);

    try {
        // Chama o método 'safeMint' do contrato para criar um novo token
        const tx = contratoInteligente.methods.safeMint(to, tokenId, imageIndex);
        
        // Estima o valor de gás necessário para a transação
        const gas = await tx.estimateGas({ from: signer.address });

        // Envia a transação para a rede Ethereum e aguarda a confirmação
        const receipt = await tx.send({
            from: signer.address,
            gas
        }).once("transactionHash", (txhash) => {
            // Loga o hash da transação durante o processo de mineração
            console.log(`Mining transaction ...`);
            console.log(`https://${network}.etherscan.io/tx/${txhash}`);
        });

        // Após a confirmação da transação, exibe o número do bloco onde foi minerada
        console.log(`Mined in block ${receipt.blockNumber}`);
        
        // Retorna um status 200 com a confirmação do bloco onde o token foi mintado
        res.status(200).send(`Token mintado com sucesso! Bloco: ${receipt.blockNumber}`);
    } catch (error) {
        // Em caso de erro, retorna uma mensagem de erro
        console.error(error);
        res.status(500).send("Erro ao mintar o token");
    }
});

// Rota POST para comprar um token existente
app.post('/token/buy', async function(req, res) {
    // Recebe os dados (tokenId e valor em Ether) do corpo da requisição
    let { tokenId, valueInEther } = req.body;
    const network = process.env.ETHEREUM_NETWORK;

    // Conecta ao provedor Ethereum usando Infura
    const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`));
    
    // Cria um objeto para assinar transações usando a chave privada do ambiente
    const signer = web3.eth.accounts.privateKeyToAccount(process.env.SIGNER_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(signer); // Adiciona a conta de assinatura ao wallet do Web3

    // Cria uma instância do contrato inteligente
    var contratoInteligente = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);

    try {
        // Converte o valor de Ether para Wei
        const valueInWei = web3.utils.toWei(valueInEther, 'ether');
        
        // Chama o método 'buyToken' do contrato para comprar o token
        const tx = contratoInteligente.methods.buyToken(tokenId);

        // Estima o valor de gás necessário para a transação
        const gas = await tx.estimateGas({ from: signer.address, value: valueInWei });

        // Envia a transação para a rede Ethereum e aguarda a confirmação
        const receipt = await tx.send({
            from: signer.address,
            gas,
            value: valueInWei
        }).once("transactionHash", (txhash) => {
            // Loga o hash da transação durante o processo de mineração
            console.log(`Mining transaction ...`);
            console.log(`https://${network}.etherscan.io/tx/${txhash}`);
        });

        // Após a confirmação da transação, exibe o número do bloco onde foi minerada
        console.log(`Mined in block ${receipt.blockNumber}`);
        
        // Retorna um status 200 com a confirmação do bloco onde a compra foi realizada
        res.status(200).send(`Compra realizada com sucesso! Bloco: ${receipt.blockNumber}`);
    } catch (error) {
        // Em caso de erro, retorna uma mensagem de erro
        console.error(error);
        res.status(500).send("Erro ao comprar o token");
    }
});

// Rota GET para obter a URI de um token específico
app.get('/token/uri', async function(req, res) {
    // Conecta à rede Ethereum Sepolia via Infura
    var web3 = new Web3('https://sepolia.infura.io/v3/bece4d2938c34137ab9a21b7fe61de4e');

    // Cria uma instância do contrato inteligente
    var contratoInteligente = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
    
    // Obtém o tokenId da query string da requisição
    let tokenId = req.query.tokenId;
    
    try {
        // Chama o método 'tokenURI' do contrato inteligente para obter a URI do token
        let uri = await contratoInteligente.methods.tokenURI(tokenId).call();
        
        // Retorna a URI do token como resposta JSON
        res.json({ tokenId, uri });
    } catch (error) {
        // Em caso de erro, retorna uma mensagem de erro
        console.error(error);
        res.status(500).send("Erro ao obter URI do token");
    }
});

// Inicializa o servidor Express na porta 3001
app.listen(3001, () => {
    console.log('Rodando meu servidor');
});