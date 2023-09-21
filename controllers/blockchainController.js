// import required modules
const bscHelper = require("../helpers/bscHelper");
const sendResponse = require("../helpers/responseSender");
const { ethers, BigNumber } = require("ethers");
const cron = require("node-cron");
require("dotenv").config({ path: "../.env" });

//import ABI files
const abi = require("./abi.json");
const abi2 = require("./abi2.json");

// Set up the provider
const providerUrl = process.env.PROVIDER_URL;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

// Set up the wallets (replace the private keys and addresses with your own)
const privateKey1 = process.env.PRIVATEKEY1;
const wallet1 = new ethers.Wallet(privateKey1, provider);
const address1 = process.env.ADDRESS1;

const privateKey2 = process.env.PRIVATEKEY2;
const wallet2 = new ethers.Wallet(privateKey2, provider);
const address2 = process.env.ADDRESS2;

const wallets = [wallet1, wallet2];
const addresses = [address1, address2];

// Set up the router contract
const UNISWAPV2_ROUTER02_ABI = abi;
const PAIR_ABI = abi2;
const routerAddress = process.env.ROUTER_ADDRESS;
const pairAddress = process.env.PAIR_ADDRESS;

// Set up the trade details (replace the addresses and amounts with your own)
const tokenInAddress = process.env.TOKEN_IN_ADDRESS
const tokenOutAddress = process.env.TOKEN_OUT_ADDRESS

const routerContract = new ethers.Contract(
  routerAddress,
  UNISWAPV2_ROUTER02_ABI,
  provider
);

const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);

async function tradingBot() {
  async function getPrice() {
    const pairAmount = await pairContract.getReserves();
    return pairAmount[0] / pairAmount[1];
  }

  let currentPrice = await getPrice(); // Starting price
  console.log(currentPrice, "getCurrentPrice");

  let targetPrice = process.env.TARGET_PRICE; // Target price
  const priceIncrement = (targetPrice - currentPrice) / 15; // Increment required to reach target price in 15 days
  let pricePaused = false;

  cron.schedule("*/15 * * * * *", async () => {
    console.log("Starting trade...");

    if (pricePaused) {
      console.log("Price increment paused.");
      return;
    }

    if (currentPrice > targetPrice) {
      console.log(
        `Target price of ${ethers.utils.formatEther(
          targetPrice
        )} ETH has been reached. Price increment paused.`
      );
      pricePaused = true;
      return;
    }

    currentPrice = currentPrice + priceIncrement;
    const path = [tokenInAddress, tokenOutAddress];
    const amountIn = ethers.utils.parseEther("0.0000001");

    const amounts = await routerContract.getAmountsOut(amountIn, path);

    const amountInRequired = (amountIn * currentPrice) / amounts[1];
    console.log(amountInRequired, "==============j");

    let amountInRequiredNew = ethers.utils.parseUnits(
      amountInRequired.toString(),
      17
    );

    console.log(amountInRequiredNew, "============================1");

    const to = addresses[1];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
    console.log(amountInRequiredNew.toString());

    for (let i = 0; i < wallets.length; i++) {
      try {
        // const data = routerContract.methods
        //   .swapExactTokensForTokens(amountInRequired, 0, path, to, deadline)
        //   .encodeABI();
        // let estimates_gas = await web3js.eth.estimateGas({
        //   from: wallets[i].address,
        //   to: routerAddress,
        //   data: data,
        // });
        // console.log(estimates_gas);
        const tx = await routerContract
          .connect(wallets[i])
          .swapExactETHForTokens(0, path, to, deadline, {
            gasLimit: 1000000,
            gasPrice: ethers.utils.parseUnits("50", "gwei"),
            nonce: await wallets[i].getTransactionCount(),
            value: amountInRequiredNew,
          });
        console.log(
          `Trade successful for wallet ${i + 1}. Transaction hash: ${tx.hash}`
        );
      } catch (e) {
        console.log(`Trade failed for wallet ${i + 1}. Error: ${e}`);
      }
    }
    console.log(
      `Trade complete. Price is now ${ethers.utils.formatEther(
        currentPrice
      )} ETH.`
    );
  });
}

tradingBot();
