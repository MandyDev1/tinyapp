const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const PORT = 8080;
const bcrypt = require("bcryptjs");
const { getUserByEmail } = require("./helpers");

app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['mySecrectKey']
}));
app.set("view engine", "ejs");

// New urlDatabase structure
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "userRandomID",
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "user2RandomID",
  },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 6;
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters[randomIndex];
  }

  return randomString;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

// Display the URLs for the logged-in user, or return an error message if user is not logged in
app.get("/urls", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (!user) {
    // User is not logged in, return an error message
    return res.send("<h1>Login Required</h1><p>You need to log in to access the URL page. <a href='/login'>Click here to log in</a>.</p>");
  }
  const userUrls = urlsForUser(user_id);
  const templateVars = { urls: userUrls, user };
  res.render("urls_index", templateVars);
});

// Helper function to return URLs where the userID is equal to the id of the currently logged-in user
const urlsForUser = (id) => {
  const userUrls = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userUrls[shortURL] = urlDatabase[shortURL];
    }
  }
  return userUrls;
}

// Display new URL creation page for the logged-in user, or redirect to login page
app.get("/urls/new", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (user) {
    const templateVars = { user };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// Display individual URL page (GET /urls/:id) for the logged-in user, or return relevant error messages
app.get("/urls/:id", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (!user) {
    // User is not logged-in, display an error message
    return res.send("<h2>You need to log in to view this URL.</h2>");
  }
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];
  if (!url || url.userID !== user_id) {
    // URL doesn't exist or doesn't belong to the user, display an error message
    return res.status(403).send("<h2>You do not have permission to view this URL.</h2>");
  }
  const templateVars = {
    id: shortURL,
    longURL: url.longURL, // Access longURL from the new urlDatabase structure
    user_id,
  }
  res.render("urls_show", templateVars);
});

// Create new URL and save it to the database if the user is logged in
app.post("/urls", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (!user) {
    return res.status(401).send("You need to log in to create short URLs.");
  }
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL,
    userID: user_id,
  };
  res.redirect(`/urls/${shortURL}`);
});

// Delete a specific URL from the database
app.post("/urls/:id/delete", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (!user) {
    // User is not logged in, send an error message
    return res.status(401).send("<h2>You need to log in to delete the URL.</h2>");
  }
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];
  if (!url) {
    // URL doesn't exist, return an error message
    return res.status(404).send("<h2>URL not found.</h2>"); 
  }
  if (url.userID !== user_id) {
    // User doesn't own the URL, return an error message
    return res.status(403).send("<h2>You do not have permission to delete this URL.");
  }
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// Edit the long URL of a specific short URL
app.post("/urls:id", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (!user) {
    // User is not logged in, return an error message
    return res.status(401).send("<h2>You need to log in to edit this URL.</h2>");
  }
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];
  if (!url) {
    // URL doesn't exist, return an error message
    return res.status(404).send("<h2>URL not found.</h2>");
  }
  if (url.userID !== user_id) {
    // User doesn't own the URL, return an error message
    return res.status(403).send("<h2>You do not have permission to edit this URL.</h2>");
  }
  const newLongURL = req.body.longURL;
  urlDatabase[shortURL].longURL = newLongURL;
  res.redirect("/urls");
});

// Redirect to the original long URL via short URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL];
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send("<h2>Short URL not found</h2>");
  }
});

// Display login page, if user is logged in, redirect to /urls
app.get("/login", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (user) {
    res.redirect("/urls");
  } else {
    const templateVars = { user };
    res.render('urls_login', templateVars);
  }
});

// Handle user login request
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).send('User with this email does not exist');
  }
  // Compare the provided password with the hashed password stored in the user object
  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(403).send('Invalid password');
  }
  res.cookie('user_id', user.id);
  res.redirect("/urls");
});

// Handle user logout request
app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect("/login");
});

// Display user registration page, if user is logged in, redirect to /urls
app.get("/register", (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (user) {
    res.redirect("/urls");
  } else {
    const templateVars = { user };
    res.render("urls_register", templateVars);
  }
});

// Helper function to add a new user to the users object
const addUser = ({ email, password }) => {
  const newUserId = generateRandomString();
  users[newUserId] = {
    id: newUserId,
    email,
    password
  };
  return users[newUserId];
};

// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Handle user registration request
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email)) {
    return res.status(400).send('Invalid email format');
  } else if (password === '') {
    return res.status(400).send('Password is required');
  }
  if (getUserByEmail(email, users)) {
    return res.status(400).send('This email is already registered');
  }
  const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password
  const newUser = addUser({ email, password: hashedPassword }); // Save the hashed password
  res.cookie('user_id', newUser.id);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});