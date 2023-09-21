const web3 = require("web3");
const Common = require("ethereumjs-common");
const Tx = require("ethereumjs-tx");
const KEY1 = process.env.KEY1;
const KEY2 = process.env.KEY2;
const KEY3 = process.env.KEY3;
const KEY4 = process.env.KEY4;

const chainList = require("../json/Chain.json");
const tokenAbi = require("../ABI/ERC20TokenAbi.json");
const pairAbi = require("../ABI/PairAbi.json");
const routerAbi = require("../ABI/RouterAbi.json");
const chains = chainList.Chains;
const chainId = 97;

//pancake
// const PairAddress = "0xad4A64cF846fca07BE3c4479ED5CFbFdE76057be";
const RouterAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
// const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

//own dex
// const PairAddress = "0x9Ca94524Cecf9DAB787E1efF2cCF9342dB93ef8A"; bnb-yuse
// const PairAddress = "0xB85C53e8651c40d97f54b309cBe94f1B80F38af5"; busd-yuse
// const BUSD = "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7";
// const RouterAddress = "0xed7eef36d72c701ff23b7a9fdd50002e504ae330";
const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

const TradingBotWithBNB = async (tokenAddress, targetPrice, pairAddress) => {
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
    let sender_private_key1 = KEY1;
    var address = web3js.eth.accounts.privateKeyToAccount(sender_private_key1);
    var sender_address = address.address;
    const privateKey0 = Buffer.from(sender_private_key1, "hex");

    let sender_private_key2 = KEY2;
    var address2 = web3js.eth.accounts.privateKeyToAccount(sender_private_key2);
    var sender_address2 = address2.address;
    const privateKey2 = Buffer.from(sender_private_key2, "hex");

    let sender_private_key3 = KEY3;
    var address3 = web3js.eth.accounts.privateKeyToAccount(sender_private_key3);
    var sender_address3 = address3.address;
    const privateKey3 = Buffer.from(sender_private_key3, "hex");

    let sender_private_key4 = KEY4;
    var address4 = web3js.eth.accounts.privateKeyToAccount(sender_private_key4);
    var sender_address4 = address4.address;
    const privateKey4 = Buffer.from(sender_private_key4, "hex");

    const senderAddressArray = [
      sender_address,
      sender_address2,
      sender_address3,
      sender_address4,
    ];

    const privateKeyArray = [
      privateKey0,
      privateKey2,
      privateKey3,
      privateKey4,
    ];

    let reserveIn;
    let reserveOut;
    let notapproved = 0;

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
    if (targetPrice < currentPrice) {
      console.log("buy");

      let emptyWallet = 0; //  variable that shows the number of wallets having unsufficient fund

      async function Buy(index) {
        let AmountIn = "0x" + parseInt(reserveOut / 95).toString(16);

        let walletBalance = await web3js.eth.getBalance(
          senderAddressArray[index]
        );

        if (
          parseInt(walletBalance) <
          parseInt(AmountIn) + parseInt(6093830000000000)  //manual gas limit
        ) {
          emptyWallet++;

          console.log(
            "this wallet at index",
            index,
            " is out of balance and moving for next wallet"
          );

          if (emptyWallet == senderAddressArray.length) {
            console.log("all accounts are empty");
            return;
          } else {
            index = (index + 1) % senderAddressArray.length;
            await Buy(index);
            // return;
          }
        } else {
          emptyWallet = 0;
          let count = await web3js.eth.getTransactionCount(
            senderAddressArray[index]
          );

          let Path = [wbnb, tokenAddress];
          let AmountOut = 0;
          let deadline = parseInt(100000000000);
          let RouterContract = new web3js.eth.Contract(
            routerAbi,
            RouterAddress
          );
          let data = await RouterContract.methods
            .swapExactETHForTokens(
              AmountOut,
              Path,
              senderAddressArray[index],
              deadline
            )
            .encodeABI();

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: RouterAddress,
            data: data,
            value: AmountIn,
          });

          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);

          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: RouterAddress,
            data: data,
            value: AmountIn,
            nonce: web3js.utils.toHex(count),
          };

          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );
          console.log("Transaction hash: ", hash1.logs[0].transactionHash);
          currentPrice = await calculatePrice();  

          if (targetPrice > currentPrice) {
            console.log("reached", currentPrice, targetPrice);
            return;
          } else {
            console.log("Notreached", currentPrice, targetPrice);
            index = (index + 1) % senderAddressArray.length;
            await Buy(index);

            return hash1;
            // return;
          }
        }
      }

      await Buy(0);
    } else if (targetPrice > currentPrice) {
      console.log("Initiating sell");

      // token approval code;
      async function ApproveToken(index) {
        let count = await web3js.eth.getTransactionCount(
          senderAddressArray[index]
        );
        let AmountIn = "0x" + parseInt(reserveIn).toString(16);
        let ERCToken = new web3js.eth.Contract(tokenAbi, tokenAddress);

        const balance = await ERCToken.methods
          .balanceOf(senderAddressArray[index])
          .call();

        let walletBalance = await web3js.eth.getBalance(
          senderAddressArray[index]
        );
        if (walletBalance > 947210000000000 && balance > AmountIn) {
          notapproved--;

          let data = await ERCToken.methods
            .approve(RouterAddress, AmountIn)
            .encodeABI();

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: tokenAddress,
            data: data,
          });

          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);
          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: tokenAddress,
            data: data,
            // "value": web3js.utils.toWei(sendAmount, "ether"),
            nonce: web3js.utils.toHex(count),
          };
          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          // send signed function

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );

          return hash1;
        } else {
          console.log("found insufficient balance for index", index);
          return 0;
        }
      }

      async function Sell(index) {
        const boolApprove = await ApproveToken(index);

        if (boolApprove) {
          notapproved = 0;

          let count = await web3js.eth.getTransactionCount(
            senderAddressArray[index]
          );
          let AmountIn = "0x" + parseInt(reserveIn / 95).toString(16);

          let Path = [tokenAddress, wbnb];
          let AmountOut = 0;
          let deadline = parseInt(100000000000);
          let RouterContract = new web3js.eth.Contract(
            routerAbi,
            RouterAddress
          );
          let data = await RouterContract.methods
            .swapExactTokensForETH(
              AmountIn,
              AmountOut,
              Path,
              senderAddressArray[index],
              deadline
            )
            .encodeABI();

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: RouterAddress,
            data: data,
          });

          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);
          // console.log(gasLimit*gasPrice)

          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: RouterAddress,
            data: data,
            // value: web3js.utils.toWei(sendAmount, "ether"),
            nonce: web3js.utils.toHex(count),
          };

          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          // send signed function

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );
          console.log("Transaction hash: ", hash1.logs[0].transactionHash);

          currentPrice = await calculatePrice();

          if (targetPrice < currentPrice) {
            console.log("reached", currentPrice, targetPrice);
          } else {
            console.log("Notreached", currentPrice, targetPrice);
            index = (index + 1) % 4;
            await Sell(index);
          }

          return hash1;
        } else {
          console.log("fund not approved wallet at index", index);
          notapproved++;
          if (notapproved >= senderAddressArray.length) {
            console.log(
              "All wallets found unpproved now, ending sell function"
            );
          } else {
            console.log("Trying to approve next wallet");
            index = (index + 1) % senderAddressArray.length;
            await Sell(index);
          }
        }
      }
      await Sell(0);
    }
    currentPrice = await calculatePrice();

    return currentPrice;
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

const TradingBotWithOutBNB = async (
  tokenAddress,
  targetPrice,
  respectedToken,
  pairAddress
) => {
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
    let sender_private_key1 = KEY1;
    var address = web3js.eth.accounts.privateKeyToAccount(sender_private_key1);
    var sender_address = address.address;
    const privateKey0 = Buffer.from(sender_private_key1, "hex");

    let sender_private_key2 = KEY2;
    var address2 = web3js.eth.accounts.privateKeyToAccount(sender_private_key2);
    var sender_address2 = address2.address;
    const privateKey2 = Buffer.from(sender_private_key2, "hex");

    let sender_private_key3 = KEY3;
    var address3 = web3js.eth.accounts.privateKeyToAccount(sender_private_key3);
    var sender_address3 = address3.address;
    const privateKey3 = Buffer.from(sender_private_key3, "hex");

    let sender_private_key4 = KEY4;
    var address4 = web3js.eth.accounts.privateKeyToAccount(sender_private_key4);
    var sender_address4 = address4.address;
    const privateKey4 = Buffer.from(sender_private_key4, "hex");

    const senderAddressArray = [
      sender_address,
      sender_address2,
      sender_address3,
      sender_address4,
    ];

    const privateKeyArray = [
      privateKey0,
      privateKey2,
      privateKey3,
      privateKey4,
    ];

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
    console.log("current price : ", currentPrice);

    if (targetPrice < currentPrice) {
      console.log("buy");

      async function ApproveTokenBuy(index) {
        let ERCToken = new web3js.eth.Contract(tokenAbi, tokenAddress);
        let count = await web3js.eth.getTransactionCount(
          senderAddressArray[index]
        );
        let AmountIn = "0x" + parseInt(reserveOut / 95).toString(16);

        const balance = await ERCToken.methods
          .balanceOf(senderAddressArray[index])
          .call();
        let walletBalance = await web3js.eth.getBalance(
          senderAddressArray[index]
        );

        if (AmountIn < balance && walletBalance > 6093830000000000) {
          let data = await ERCToken.methods
            .approve(RouterAddress, AmountIn)
            .encodeABI();

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: tokenAddress,
            data: data,
          });

          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);

          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: respectedToken,
            data: data,
            // "value": web3js.utils.toWei(sendAmount, "ether"),
            nonce: web3js.utils.toHex(count),
          };

          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          // send signed function

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );
          return hash1;
        } else {
          return false;
        }
      }

      async function Buy(index) {
        let boolApprove = await ApproveTokenBuy(index);

        if (boolApprove) {
          let AmountIn = "0x" + parseInt(reserveOut / 95).toString(16);

          let count = await web3js.eth.getTransactionCount(
            senderAddressArray[index]
          );
          let Path = [respectedToken, tokenAddress];
          let AmountOut = 0;
          let deadline = parseInt(100000000000);
          let RouterContract = new web3js.eth.Contract(
            routerAbi,
            RouterAddress
          );
          let data = await RouterContract.methods
            .swapExactTokensForTokens(
              AmountIn,
              AmountOut,
              Path,
              senderAddressArray[index],
              deadline
            )
            .encodeABI();
          console.log("AmountIn", AmountIn);

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: RouterAddress,
            data: data,
          });
          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);

          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: RouterAddress,
            data: data,
            // "value": web3js.utils.toWei(sendAmount, "ether"),
            nonce: web3js.utils.toHex(count),
          };

          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );
          currentPrice = await calculatePrice();
          if (targetPrice > currentPrice) {
            console.log("reached", currentPrice, targetPrice);
          } else {
            console.log("Notreached", currentPrice, targetPrice);
            index = (index + 1) % senderAddressArray.length;
            await Buy(index);
          }

          return hash1;
        } else {
          notapproved++;
          if (notapproved >= senderAddressArray.length) {
            console.log("cant approve any wallet further");
          } else {
            index = (index + 1) % senderAddressArray.length;
            await Buy(index);
          }
        }
      }
      let notapproved = 0;
      await Buy(0);
    } else if (targetPrice > currentPrice) {
      console.log("sell");
      // token approval code;

      async function ApproveTokenSell(index) {
        let ERCToken = new web3js.eth.Contract(tokenAbi, tokenAddress);

        const balance = await ERCToken.methods
          .balanceOf(senderAddressArray[index])
          .call();

        let AmountIn = "0x" + parseInt(reserveIn / 95).toString(16);

        let walletBalance = await web3js.eth.getBalance(
          senderAddressArray[index]
        );

        console.log(
          "walletBalance: ",
          parseInt(walletBalance),
          "balance: ",
          parseInt(balance),
          "AmountIn: ",
          parseInt(AmountIn)
        );

        if (walletBalance > 947210000000000 && balance > AmountIn) {
          console.log("approved for index", index);

          let ERCToken = new web3js.eth.Contract(tokenAbi, tokenAddress);

          let count = await web3js.eth.getTransactionCount(
            senderAddressArray[index]
          );
          let data = await ERCToken.methods
            .approve(RouterAddress, AmountIn)
            .encodeABI();

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: tokenAddress,
            data: data,
          });

          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);

          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: tokenAddress,
            data: data,
            // "value": web3js.utils.toWei(sendAmount, "ether"),
            nonce: web3js.utils.toHex(count),
          };

          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          // send signed function

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );
          return hash1;
        } else {
          return false;
        }
      }

      async function Sell(index) {
        let boolApprove = await ApproveTokenSell(index);

        if (boolApprove) {
          let count = await web3js.eth.getTransactionCount(
            senderAddressArray[index]
          );
          let Path = [tokenAddress, respectedToken];
          let AmountIn = "0x" + parseInt(reserveIn / 95).toString(16);
          let AmountOut = 0;
          let deadline = parseInt(100000000000);
          let RouterContract = new web3js.eth.Contract(
            routerAbi,
            RouterAddress
          );
          let data = await RouterContract.methods
            .swapExactTokensForTokens(
              AmountIn,
              AmountOut,
              Path,
              senderAddressArray[index],
              deadline
            )
            .encodeABI();

          let estimates_gas = await web3js.eth.estimateGas({
            from: senderAddressArray[index],
            to: RouterAddress,
            data: data,
          });

          // gas calculate
          let gasLimit = web3js.utils.toHex(estimates_gas * 3);
          let gasPrice_bal = await web3js.eth.getGasPrice();
          let gasPrice = web3js.utils.toHex(gasPrice_bal);

          var rawTransaction = {
            from: senderAddressArray[index],
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: RouterAddress,
            data: data,
            // "value": web3js.utils.toWei(sendAmount, "ether"),
            nonce: web3js.utils.toHex(count),
          };

          const common = Common.default.forCustomChain(
            "mainnet",
            {
              name: "bnb",
              networkId: 97,
              chainId: 97,
            },
            "petersburg"
          );

          // send signed function

          var transaction = new Tx(rawTransaction, { common });
          transaction.sign(privateKeyArray[index]);

          let hash1 = await web3js.eth.sendSignedTransaction(
            "0x" + transaction.serialize().toString("hex")
          );

          currentPrice = await calculatePrice();
          if (targetPrice < currentPrice) {
            console.log("reached", currentPrice, targetPrice);
          } else {
            console.log("Notreached", currentPrice, targetPrice);
            index = (index + 1) % 4;
            const sell = await Sell(index);
            return hash1;
          }
        } else {
          notapproved++;
          if (notapproved >= senderAddressArray.length) {
            console.log("cant approve any wallet further");
          } else {
            index = (index + 1) % senderAddressArray.length;
            await Sell(index);
          }
        }
      }

      let notapproved = 0;
      await Sell(0);
    }
    currentPrice = await calculatePrice();
    return currentPrice;
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

module.exports = {
  TradingBotWithBNB,
  TradingBotWithOutBNB,
};
