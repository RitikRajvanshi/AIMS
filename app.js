var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
// const dotenv = require('dotenv');
var logger = require('morgan');
var cors = require('cors');
var bodyParser = require('body-parser');
require('./services/scheduler');
require('dotenv').config();
// import fetch from 'node-fetch';


// dotenv.config( {
//   path: path.join(__dirname, '.env')
// } );
// dotenv.config({ path: path.join(__dirname, '.env') });


// routes
var indexRouter = require('./routes/index');
var sharedRouter = require('./routes/shared');
var loginRouter = require('./routes/login');
var adminRouter = require('./routes/admin');
var checkRouter = require('./routes/check');
var usersRouter = require('./routes/users');
var filesRouter = require('./routes/files');
var tokenRouter = require('./routes/token');



var app = express();

app.use(cors());
// view engine setup

app.get('/health', (req,res)=>{
  res.status(200).json('Server is healthy and service is running....');
})

//publicly availablity of files, for image upload
app.use('/files', express.static('files/invoice'));
app.use('/documents', express.static('files/documents'));
app.use('/companyData', express.static('files/companyData'));
app.use('/quotations', express.static('files/quotations'));

app.set('views', path.join(__dirname, 'views'));
// console.log(__dirname);
app.set('view engine', 'pug');


app.use(logger('dev'));
app.use(express.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({ extended: false, limit:'50mb' }));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


// const dirname = path.resolve();
// const fullfilespath = dirname+'\\'+'files' ;
// app.use('public', express.static(fullfilespath));


// const dirname = express.static(path.join(__dirname, 'public'))
// app.use('',express.static(dirname+'\\'+'files'));
// console.log(dirname+'\\'+'files');



// admin
app.use('/', indexRouter);
app.use('/shared', sharedRouter);
app.use('/login', loginRouter);
app.use('/admin', adminRouter);
app.use('/check',checkRouter);
app.use('/files',filesRouter);

//users
app.use('/users',usersRouter);
app.use('/',tokenRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
