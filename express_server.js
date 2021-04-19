const express = require("express");
const app = express();
const PORT = 8080;

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieSession = require("cookie-session");
app.use(cookieSession({
  name: "session",
  keys: ["secret key 1", "secret key 2"]
}));

const bcrypt = require("bcrypt");

app.set("view engine", "ejs");

const { getUserByEmail } = require("./helpers");

const generateRandomString = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
};

const urlsForUser = (id) => {
  const userURL = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userId === id) {
      userURL[shortURL] = urlDatabase[shortURL];
    }
  }
  return userURL;
};

const urlDatabase = {};

const users = {};

// if sure logged in redirect to /urls if not to /login
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

// display urls that are owned by the user
app.get("/urls", (req, res) => {
  const userId = req.session.userId;
  const userURL = urlsForUser(userId);
  const templateVars = { urls: userURL, user: users[userId] };
  if (!userId) {
    return res.status(401).send("You are not logged in");
  }
  res.render("urls_index", templateVars);
});

// create new url
app.get("/urls/new", (req, res) => {
  if (req.session.userId) {
    const templateVars = {user: users[req.session.userId]};
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// displays information on shortURL
app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session.userId;
  const userURL = urlsForUser(userId);
  const templateVars = { shortURL: req.params.shortURL, user: users[userId], urls: userURL };
  res.render("urls_show", templateVars);
});

// redirects to the acutal url if it exists
app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  } else {
    res.status(404).send('This shortURL does not exist!');
  }
});

// if user is logged in generates shortURL
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL, userId: req.session.userId
  };
  res.redirect(`/urls/${shortURL}`);
});

// deletes the url
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.session.userId === urlDatabase[shortURL].userId) {
    delete urlDatabase[shortURL];
  }
  res.redirect("/urls");
});

// if user is logged in, update url and redirects to urls
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.session.userId === urlDatabase[shortURL].userId) {
    urlDatabase[shortURL].longURL = req.body.longURL;
  }
  res.redirect("/urls");
});

// login page
app.get("/login", (req, res) => {
  if (req.session.userId) {
    res.redirect("/urls");
    return;
  }
  const templateVars = {user: users[req.session.userId]};
  res.render("urls_login", templateVars);
});

// logs in the user to /urls page if the email and password is correct
app.post("/login", (req, res) => {
  const user = getUserByEmail(req.body.email, users);
  if (user) {
    if (bcrypt.compareSync(req.body.password, user.password)) {
      req.session.userId = user.id;
      res.redirect("/urls");
    } else {
      res.status(403).send("The entred password is incorrect");
    }
  } else {
    res.status(403).send("This email does not exist");
  }
});

// logs the user out
app.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.clearCookie("session.sig");
  res.redirect("/login");
});

// new registration page
app.get("/register", (req, res) => {
  if (req.session.userId) {
    res.redirect("/urls");
    return;
  }
  const templateVars = {user: users[req.session.userId]};
  res.render("urls_registration", templateVars);
});

//registers the user and takes them to to /urls page if the email and password is correct
app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send("Email or password is empty.");
  } else if (getUserByEmail(req.body.email, users)) {
    res.status(400).send("Email is already existing. Please login.");
  } else {
    let userId = generateRandomString();
    users[userId] = {
      id: userId,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session.userId = userId;
    res.redirect("/urls");
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});