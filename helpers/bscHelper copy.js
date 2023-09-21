const web3 = require("web3");
const Common = require("ethereumjs-common");
const Tx = require("ethereumjs-tx");
const KEY1 = process.env.KEY1;
const walletAddress = process.env.WALLET1;
const chainList = require("../json/Chain.json");
const tokenAbi = require("../ABI/ERC20TokenAbi.json");
const pairAbi = require("../ABI/PairAbi.json");
const routerAbi = require("../ABI/RouterAbi.json");
const chains = chainList.Chains;
const chainId = 97;

const PairAddress = "0xad4A64cF846fca07BE3c4479ED5CFbFdE76057be";
const RouterAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

const TradingBotWithBNB = async (tokenAddress, targetPrice) => {
  try {
    targetPrice = parseFloat(targetPrice);
    //
    let selectedcontract = chains.filter(
      (contract) => contract.chainId == chainId
    );
    selectedcontract = selectedcontract[0];
    const web3js = new web3(
      new web3.providers.HttpProvider(selectedcontract.rpc)
    );
    //wallet 
    let sender_private_key = KEY1;
    var address = web3js.eth.accounts.privateKeyToAccount(sender_private_key);
    var sender_address = address.address;
    const privateKey = Buffer.from(sender_private_key, 'hex');
    let reserveIn;
    let reserveOut;
    async function calculatePrice() {
      let pairContract = new web3js.eth.Contract(pairAbi, PairAddress);
      let Reserve = await pairContract.methods.getReserves().call();
      let token0 = await pairContract.methods.token0().call();
      if (token0.toLowerCase() === tokenAddress.toLowerCase()) {
        reserveIn = Reserve._reserve0;
        reserveOut = Reserve._reserve1;
      } else {
        reserveIn = Reserve._reserve1;
        reserveOut = Reserve._reserve0;
      }
      let currentPrice = reserveIn / reserveOut;
      return currentPrice;    // token/bnb
    }
    let currentPrice = await calculatePrice();
    console.log(currentPrice);
    if (targetPrice < currentPrice) {
      console.log("buy");
      async function Buy() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let Path = [wbnb, tokenAddress]
        let AmountIn = "0x" + (parseInt(reserveOut / 95)).toString(16);
        let AmountOut = 0;
        let deadline = parseInt(100000000000);
        let RouterContract = new web3js.eth.Contract(routerAbi, RouterAddress);
        let data = await RouterContract.methods.swapExactETHForTokens(
          AmountOut,
          Path,
          walletAddress,
          deadline
        ).encodeABI();
        console.log("AmountIn", AmountIn);

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: RouterAddress,
          data: data,
          value: AmountIn,
        });
        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": RouterAddress,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "value": AmountIn,
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      const buy = await Buy();
      console.log(buy);
      currentPrice = await calculatePrice();
      if (targetPrice > currentPrice) {
        console.log("reached", currentPrice, targetPrice)
      } else {
        console.log("Notreached", currentPrice, targetPrice);
        const buy = await Buy();
        console.log(buy);
      }

    } else if (targetPrice > currentPrice) {
      console.log("sell");
      // token approval code;
      async function ApproveToken() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let AmountIn = "0x" + (parseInt(reserveIn)).toString(16);
        let ERCToken = new web3js.eth.Contract(tokenAbi, tokenAddress);
        let data = await ERCToken.methods.approve(
          RouterAddress,
          AmountIn
        ).encodeABI();

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: tokenAddress,
          data: data,
        });

        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": tokenAddress,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      async function Sell() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let Path = [tokenAddress, wbnb]
        let AmountIn = "0x" + (parseInt(reserveIn / 95)).toString(16);
        let AmountOut = 0;
        let deadline = parseInt(100000000000);
        let RouterContract = new web3js.eth.Contract(routerAbi, RouterAddress);
        let data = await RouterContract.methods.swapExactTokensForETH(
          AmountIn,
          AmountOut,
          Path,
          walletAddress,
          deadline
        ).encodeABI();

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: RouterAddress,
          data: data,
        });

        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": RouterAddress,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      let Approve = await ApproveToken();
      console.log("Approve", Approve);
      let sell = await Sell();
      console.log("sell", sell);
      currentPrice = await calculatePrice();
      if (targetPrice < currentPrice) {
        console.log("reached", currentPrice, targetPrice)
      } else {
        console.log("Notreached", currentPrice, targetPrice);
        let sell = await Sell();
        console.log("sell", sell);
      }
    }
    currentPrice = await calculatePrice();
    return currentPrice;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const TradingBotWithOutBNB = async (tokenAddress, targetPrice, respectedToken, pairAddress) => {
  try {
    targetPrice = parseFloat(targetPrice);
    //
    let selectedcontract = chains.filter(
      (contract) => contract.chainId == chainId
    );
    selectedcontract = selectedcontract[0];
    const web3js = new web3(
      new web3.providers.HttpProvider(selectedcontract.rpc)
    );
    //wallet 
    let sender_private_key = KEY1;
    var address = web3js.eth.accounts.privateKeyToAccount(sender_private_key);
    var sender_address = address.address;
    const privateKey = Buffer.from(sender_private_key, 'hex');
    let reserveIn;
    let reserveOut;
    async function calculatePrice() {
      let pairContract = new web3js.eth.Contract(pairAbi, pairAddress);
      let Reserve = await pairContract.methods.getReserves().call();
      let token0 = await pairContract.methods.token0().call();
      if (token0.toLowerCase() === tokenAddress.toLowerCase()) {
        reserveIn = Reserve._reserve0;
        reserveOut = Reserve._reserve1;
      } else {
        reserveIn = Reserve._reserve1;
        reserveOut = Reserve._reserve0;
      }
      let currentPrice = reserveIn / reserveOut;
      return currentPrice;
    }
    let currentPrice = await calculatePrice();
    console.log(currentPrice);
    if (targetPrice < currentPrice) {
      console.log("buy");
      async function ApproveTokenBuy() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let AmountIn = "0x" + (parseInt(reserveOut)).toString(16);
        let ERCToken = new web3js.eth.Contract(tokenAbi, respectedToken);
        let data = await ERCToken.methods.approve(
          RouterAddress,
          AmountIn
        ).encodeABI();

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: tokenAddress,
          data: data,
        });

        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": respectedToken,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      async function Buy() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let Path = [respectedToken, tokenAddress]
        let AmountIn = "0x" + (parseInt(reserveOut / 95)).toString(16);
        let AmountOut = 0;
        let deadline = parseInt(100000000000);
        let RouterContract = new web3js.eth.Contract(routerAbi, RouterAddress);
        let data = await RouterContract.methods.swapExactTokensForTokens(
          AmountIn,
          AmountOut,
          Path,
          walletAddress,
          deadline
        ).encodeABI();
        console.log("AmountIn", AmountIn);

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: RouterAddress,
          data: data,
        });
        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": RouterAddress,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      let approve = await ApproveTokenBuy();
      console.log(approve);
      let buy = await Buy();
      console.log(buy);
      currentPrice = await calculatePrice();
      if (targetPrice > currentPrice) {
        console.log("reached", currentPrice, targetPrice)
      } else {
        console.log("Notreached", currentPrice, targetPrice);
        let buy = await Buy();
        console.log(buy);
      }

    } else if (targetPrice > currentPrice) {
      console.log("sell");
      // token approval code;
      async function ApproveToken() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let AmountIn = "0x" + (parseInt(reserveIn)).toString(16);
        let ERCToken = new web3js.eth.Contract(tokenAbi, tokenAddress);
        let data = await ERCToken.methods.approve(
          RouterAddress,
          AmountIn
        ).encodeABI();

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: tokenAddress,
          data: data,
        });

        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": tokenAddress,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      async function Sell() {
        let count = await web3js.eth.getTransactionCount(sender_address)
        let Path = [tokenAddress, respectedToken]
        let AmountIn = "0x" + (parseInt(reserveIn / 95)).toString(16);
        let AmountOut = 0;
        let deadline = parseInt(100000000000);
        let RouterContract = new web3js.eth.Contract(routerAbi, RouterAddress);
        let data = await RouterContract.methods.swapExactTokensForETH(
          AmountIn,
          AmountOut,
          Path,
          walletAddress,
          deadline
        ).encodeABI();

        let estimates_gas = await web3js.eth.estimateGas({
          from: sender_address,
          to: RouterAddress,
          data: data,
        });

        // gas calculate
        let gasLimit = web3js.utils.toHex(estimates_gas * 3);
        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal);

        var rawTransaction = {
          "from": sender_address,
          "gasPrice": gasPrice,
          "gasLimit": gasLimit,
          "to": RouterAddress,
          "data": data,
          // "value": web3js.utils.toWei(sendAmount, "ether"),
          "nonce": web3js.utils.toHex(count)
        }

        const common = Common.default.forCustomChain(
          "mainnet",
          {
            name: "bnb",
            networkId: 97,
            chainId: 97,
          },
          "petersburg"
        );

        console.log("rawTransaction", rawTransaction);
        // send signed function

        var transaction = new Tx(rawTransaction, { common });
        transaction.sign(privateKey);

        let hash1 = await web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        return hash1;
      }
      let Approve = await ApproveToken();
      console.log("Approve", Approve);
      let sell = await Sell();
      console.log("sell", sell);
      if (targetPrice < currentPrice) {
        console.log("reached", currentPrice, targetPrice)
      } else {
        console.log("Notreached", currentPrice, targetPrice);
        let sell = await Sell();
        console.log("sell", sell);
      }
    }
    currentPrice = await calculatePrice();
    return currentPrice;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = {
  TradingBotWithBNB,
  TradingBotWithOutBNB
};
