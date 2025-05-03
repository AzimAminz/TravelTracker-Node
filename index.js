import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "root",
  port: 3033,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function getUser() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

async function getCurrentUser(users) {
  return users.find((user) => user.id == currentUserId );
}

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ", [
    currentUserId
  ]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  try {
  const countries = await checkVisisted();
  const users = await getUser();
  const currentUser = await getCurrentUser(users);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
  }
  catch (err) {
    console.log(err);
  }
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    const userId = currentUserId;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode, userId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  try {
    if (req.body.add === "new") {
      res.render("new.ejs");
    }
    currentUserId = parseInt(req.body.user);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/new", async (req, res) => {
  
  const name = req.body.name;
  const color = req.body.color;
  try{
    const result = await db.query("INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;", [
      name,
      color,
    ]);

    const id = result.rows[0].id;
    currentUserId = id;
    return res.redirect("/");
  }catch (err) {
    console.log(err);
  }
  
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
