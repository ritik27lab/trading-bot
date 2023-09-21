var express = require('express');
var router = express.Router();
// const blockchainController = require('../controllers/blockchainController')
const BotController = require('../controllers/BotController')
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Trading Bot New Api' });
});

// router.get('/get-Events',blockchainController.getEvents);
router.post('/bnbWithTokenBot',BotController.BotWithBNB);
router.post('/tokenWithTokenBot',BotController.BotWithOutBNB);

module.exports = router;
