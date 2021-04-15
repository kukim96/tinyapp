const express = require("express");
const app = express();
const PORT = 8080;

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.set("view engine", "ejs");

const generateRandomString = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}

const existingEmail = (email, database) => {
  for (const user in database) {
    if(database[user].email === email) {
      return database[user];
    }
  } return undefined;
}

const urlsForUser = (id) => {
  const userURL = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userId === id) {
      userURL[shortURL] = urlDatabase[shortURL];
    }
  }
  return userURL;
}

const urlDatabase = {};

const users = {};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n")
});

app.get("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  const userURL = urlsForUser(userId);
  const templateVars = { urls: userURL, user: users[userId] };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (req.cookies['user_id']) {
    const templateVars = {user: users[req.cookies["user_id"]]};
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }  
})

app.get("/urls/:shortURL", (req, res) => {
  const userId = req.cookies["user_id"];
  const userURL = urlsForUser(userId);
  const templateVars = { shortURL: req.params.shortURL, user: users[userId], urls: userURL };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(urlDatabase[req.params.shortURL].longURL);
})

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL, userId: req.cookies["user_id"] 
  };
  res.redirect(`/urls/${shortURL}`);      
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  if(req.cookies["user_id"] === urlDatabase[shortURL].userId) {
    delete urlDatabase[shortURL];
  }
  res.redirect("/urls");
});

app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.cookies["user_id"] === urlDatabase[shortURL].userId) {
    urlDatabase[shortURL].longURL = req.body.updatedURL
  }
  res.redirect(`/urls/${shortURL}`);
});

app.get("/login", (req, res) => {
  const templateVars = {user: users[req.cookies["user_id"]]};
  res.render("urls_login", templateVars);
});

app.post("/login", (req, res) => {
  const user = existingEmail(req.body.email, users);
  if (user) {
    if(req.body.password === user.password) {
      res.cookie("user_id", user.userId);
      res.redirect("/urls");
    } else {
      res.statusCode = 403
      res.send("<h2>403 Forbidden<br>The entred password is incorrect</h2>")
    }
  } else {
    res.statusCode = 403;
    res.send("<h2>403 Forbidden<br>This email does not exist</h2>")
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  const templateVars = {user: users[req.cookies["user_id"]]};
  res.render("urls_registration", templateVars);
});

app.post("/register", (req, res) => {
  if (req.body.email && req.body.password) {
    if (!existingEmail(req.body.email, users)) {
      const userId = generateRandomString();
      users[userId] = {
        userId,
        email: req.body.email,
        password: req.body.password
      }
      res.cookie("user_id", userId);
      res.redirect("/urls");
    } else {
      res.statusCode = 400;
      res.send("<h2>400 Bad Request<br>Entered Email is already existing.</h2>")
    }
  } else {
    res.statusCode = 400;
    res.send("<h2>400 Bad Request<br>Please enter in the email and password</h2>")
  }
  
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});