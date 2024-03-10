require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
var uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const userPostsViewSchema = new mongoose.Schema({
  username: String,
  post: String,
  answer: String,
});

const userPostsSchema = new mongoose.Schema({
  username: String,
  posts: String,
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const userPosts = new mongoose.model("userpost", userPostsSchema);
const userPostView = new mongoose.model("userpostview", userPostsViewSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/" + req.user.username + "/view");
  } else {
    res.render("index");
  }
});

app.get("/sign-up", function (req, res) {
  res.render("sign-up", { error: "" });
});

app.post("/sign-up", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.register({ username: username }, password, function (err, user) {
    if (err) {
      console.log(err);
      if (err.name === "UserExistsError") {
        res.render("sign-up", { error: "User With that username Exists" });
      } else {
        res.redirect("/sign-up");
      }
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.get("/login", function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/");
  } else {
    res.render("login");
  }
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/" + user.username + "/view");
      });
    }
  });
});

app.get("/:user/logout", function (req, res) {
  req.logout();
  res.redirect("/login");
});

app.get("/:user", function (req, res) {
  userPostView.find({ username: req.params.user }, function (err, posts) {
    if (err) {
      console.log(err);
    }
    res.render("public-view", {
      user: req.params.user,
      posts: posts,
    });
  });
});

app.get("/:user/profile", function (req, res) {
  if (req.isAuthenticated()) {
    const username = req.user.username;

    res.render("user-profile", {
      user: username,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/:user/ask", function (req, res) {
  res.render("compose", {
    user: req.params.user,
    reply: false,
    post: "",
    userUrl: "/" + req.params.user,
    url: "/" + req.params.user + "/ask/",
    compose: "Please Write your Question Here",
  });
});

app.post("/:user/ask", function (req, res) {
  const newPost = new userPosts({
    username: req.params.user,
    posts: req.body.compose,
  });

  newPost.save();

  res.redirect("/" + req.params.user);
});

app.get("/view/:postId", function (req, res) {
  const postId = req.params.postId;

  userPostView.findById(postId, function (err, foundPost) {
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      res.render("detailed-user-view", {
        question: foundPost.post,
        user: foundPost.username,
        answer: foundPost.answer,
      });
    }
  });
});

app.get("/:user/view", function (req, res) {
  const username = req.params.user;

  if (req.isAuthenticated()) {
    userPosts.find({ username: username }, function (err, posts) {
      if (err) {
        res.send("Something went wrong");
      } else {
        res.render("user-view", { user: username, posts: posts, flash: "" });
      }
    });
  } else {
    res.redirect("/" + username);
  }
});

app.get("/:user/:postId", function (req, res) {
  if (req.isAuthenticated()) {
    const username = req.params.user;
    const postId = req.params.postId;

    userPosts.findById(postId, function (err, post) {
      if (err) {
        res.redirect("/" + username + "/view");
      } else {
        res.render("compose", {
          user: username,
          userUrl: "/" + req.user.username + "/view",
          reply: true,
          post: post,
          url: "/" + req.user.username + "/" + postId,
          compose: "Please Write your Answer Here",
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/:user/:postId", function (req, res) {
  const username = req.params.user;
  const postId = req.params.postId;

  const reply = req.body.compose;

  userPosts.findById(postId, function (err, foundPost) {
    if (err) {
      res.redirect("/" + username + "/view");
    } else {
      const newPost = userPostView({
        username: username,
        post: foundPost.posts,
        answer: reply,
      });
      newPost.save();
      res.redirect("/" + username + "/view");
    }
  });
});

// app.get("/test/test/test", function(req,res){
//   res.render("test")
// })

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log("The server is running on port " + PORT);
});
