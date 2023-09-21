const bscHelper = require("../helpers/bscHelper");

const BotWithBNB= async (req, res) => {
  let tokenAddress = req.body.tokenAddress;
  let targetPrice = req.body.targetPrice;
  let PairAddress = req.body.pairAddress;
  let event = await bscHelper.TradingBotWithBNB(
    tokenAddress,
    targetPrice,
    PairAddress
  );
  let obj = {
    event
  }
  console.log(obj);
  res.send({obj})
};

const BotWithOutBNB= async (req, res) => {
  let tokenAddress = req.body.tokenAddress;
  let respectedToken = req.body.respectedToken;
  let targetPrice = req.body.targetPrice;
  let pairAddress = req.body.pairAddress;
  let event = await bscHelper.TradingBotWithOutBNB(
    tokenAddress,
    targetPrice,
    respectedToken,
    pairAddress
  );
  let obj = {
    event
  };
  console.log(obj);
  res.send({ obj });
};

module.exports = {
  BotWithBNB,
  BotWithOutBNB
}
