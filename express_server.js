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

// const getUserByEmail = (email, database) => {
//   for (const user in database) {
//     if(database[user].email === email) {
//       return database[user];
//     }
//   } return undefined;
// }

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

app.get("/", (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
  } else {
    res.redirect("/urls")
  }
});

app.get("/urls.json", (req, res) => {
  res.json(users);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const userURL = urlsForUser(userId);
  const templateVars = { urls: userURL, user: users[userId] };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    const templateVars = {user: users[req.session.user_id]};
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session.user_id;
  const userURL = urlsForUser(userId);
  const templateVars = { shortURL: req.params.shortURL, user: users[userId], urls: userURL };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL, userId: req.session.user_id
  };
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.session.user_id === urlDatabase[shortURL].userId) {
    delete urlDatabase[shortURL];
  }
  res.redirect("/urls");
});

app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.session.user_id === urlDatabase[shortURL].userId) {
    urlDatabase[shortURL].longURL = req.body.longURL;
  }
  res.redirect(`/urls/${shortURL}`);
});

app.get("/login", (req, res) => {
  const templateVars = {user: users[req.session.user_id]};
  res.render("urls_login", templateVars);
});

app.post("/login", (req, res) => {
  const user = getUserByEmail(req.body.email, users);
  if (user) {
    if (bcrypt.compareSync(req.body.password, user.password)) {
      // console.log('user password: ', user.password)
      req.session.user_id = user.id;
      res.redirect("/urls");
    } else {
      // res.statusCode = 403
      // res.send("<h2>403 Forbidden<br>The entred password is incorrect</h2>")
      res.status(403).send("The entred password is incorrect");
    }
  } else {
    // res.statusCode = 403;
    // res.send("<h2>403 Forbidden<br>This email does not exist</h2>")
    res.status(403).send("This email does not exist");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.clearCookie("session.sig");
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  const templateVars = {user: users[req.session.user_id]};
  res.render("urls_registration", templateVars);
});

app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send("Email or password is empty.");
  } else if (getUserByEmail(req.body.email, users)) {
    res.status(400).send("Email is already existing. Please login.");
    res.redirect("/login");
  } else {
    let userId = generateRandomString();
    users[userId] = {
      id: userId,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session.user_id = userId;
    res.redirect("/urls");
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});