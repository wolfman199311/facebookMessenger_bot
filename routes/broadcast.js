const config = require('../config');
const express = require('express');
const userService = require('../user');
const fbService = require('./fb-service');
const router = express.Router();


router.get('/', function (req, res) {
    //res.send('Hello world, I am a chat bot')
    res.render('login');
});


router.get('/no-access', function (req, res) {
    res.render('no-access');
});

router.get('/broadcast', ensureAuthenticated, function (req, res) {
  let message = req.body.message;
     let newstype = parseInt(req.body.newstype, 10);
     req.session.newstype = newstype;
     req.session.message = message;
     userService.readAllUsers(function(users) {
         req.session.users = users;
         res.render('broadcast-confirm', {user: req.user, message: message, users: users, numUsers: users.length, newstype: newstype})
     }, newstype);
 });

router.post('/broadcast', ensureAuthenticated, function (req, res) {
  let message = req.session.message;
  let allUsers = req.session.users;

  let sender;
  for (let i=0; i < allUsers.length; i++ ) {
      sender = allUsers[i].fb_id;
      fbService.sendTextMessage(sender, message);
  }

    res.render('broadcast-confirm');
});

router.get('/broadcast-send', ensureAuthenticated, function (req, res) {
  let newstype = req.session.newstype;
  let message = req.session.message;
  let users = req.session.users;

  req.session.newstype = null;
  req.session.message = null;
  req.session.users = null;
  res.render('broadcast-sent', {message: message, users: users, numUsers:users.length, newstype: newstype});
});
});

router.get('/broadcast-sent', ensureAuthenticated, function (req, res) {
    res.render('broadcast-sent');
});

router.get('/logout', ensureAuthenticated, function (req, res) {
    req.logout();
    res.redirect('/broadcast/');
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/broadcast/');
    }
}


module.exports = router;
