var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const helmet = require("helmet");
require('dotenv').config();
var cors = require('cors');
// const DB = process.env.DB

// mongoose.set("strictQuery", false);
// mongoose.connect(DB)
//   .then(() => console.log('MongoDB Database Connected'))
//   .catch(err => console.log(err))

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  helmet({
    "Strict-Transport-Security": { "max-age": 31536000 },
  })
);

app.use(cors());

const whitelist = ['http://localhost:3000']

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,  Date, X-Api-Version, X-File-Name, user-access-token, authorization'
  )
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  /* if (req.method === 'OPTIONS') {
    return res.status(200).json({})
   } else {
    next()
   }
    */
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  } else if (
    whitelist.indexOf(req.header('Origin')) !== -1 || whitelist.indexOf(req.header('Referer')) !== -1) {
    next();
  } else {
    next()
    // return res.status(400).json("UnAuthorized");
  }
})

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
