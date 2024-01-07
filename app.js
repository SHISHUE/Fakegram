var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressSession = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const passport = require('passport');

// Add the following lines to include Socket.io
const http = require('http');
const socketIo = require('socket.io');


var app = express();
const server = http.createServer(app); // Create an HTTP server
const io = socketIo(server); // Attach Socket.io to the server

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: "hey hey hey"
}));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(usersRouter.serializeUser());
passport.deserializeUser(usersRouter.deserializeUser());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const onlineUsers = {};

io.on('connection', (socket) => {
  // Handle user connection
  socket.on('user connected', (userId) => {
    onlineUsers[userId] = socket.id;
    // Update online status in the database
    async function update() {
      const user = await userModel.findOne({ username: req.session.passport.user });

      user.status = "Online";
      await user.save();
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const userId = Object.keys(onlineUsers).find((key) => onlineUsers[key] === socket.id);
    delete onlineUsers[userId];
    // Update offline status and last seen timestamp in the database
    async function update() {
      const user = await userModel.findOne({ username: req.session.passport.user });

      user.status = "Offline";
      await user.save();
    }
  });

  // Handle chat messages
  socket.on('chat message', (msg) => {
    const receiverSocketId = onlineUsers[msg.receiverId];
    if (receiverSocketId) {
      // If the receiver is online, emit the message directly to their socket
      io.to(receiverSocketId).emit('chat message', msg);
    } else {
      // Handle offline message storage or other logic
    }
  });

  // Handle typing status
  socket.on('typing', (data) => {
    const receiverSocketId = onlineUsers[data.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', data.isTyping);
    }
  });
});


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
