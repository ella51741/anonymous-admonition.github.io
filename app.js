// npm init -yes
// npm install dotenv express ejs body-parser method-override node-fetch
// npm install cookie-parser express-session connect-flash bcrypt mongoose

const PORT = process.env.PORT || 3000;
//server 機密資料保護
require("dotenv").config();
//express
const express = require("express");
const app = express();
const { get, send } = require("express/lib/response");
// 樣板畫面，可在裡面直接寫js
const ejs = require("ejs");
//"POST"表單
const bodyParser = require("body-parser"); //製作"POST"表單才需導入(GET不用)，和下面一行為同組必寫，不須明白
app.use(bodyParser.urlencoded({ extended: true })); //就可以取表單內值({json})
//PUT
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
//cookie
const cookieParser = require("cookie-parser");
app.use(cookieParser("thisismyscret"));
// session  設定保持登入 維持機密資料就要用
const session = require("express-session");
app.use(
  session({
    secret: process.env.SECRET, // 不會顯示.env內的資料
    resave: false,
    saveUninitialized: false,
  })
);
//flash (存在session的變數顯示頁面>>有session才可以做)
const flash = require("connect-flash");
app.use(flash());
//bcrypt    密碼加密!!!!一定要做，否則被駭要賠償責任>>passord modle (notion加密訓練)
const bcypt = require("bcrypt");
const salRounds = 10; //裝飾時間(越久裝飾越多)
//axios
const axios = require("axios");

//******* midleware ******/
app.use(express.static("public"));
app.set("view engine", "ejs");
// 驗證使否為已登入狀態 >> 免再次登入，直接進入
const requireLogin = (req, res, next) => {
  if (req.session.isVerified !== true) {
    //如果不是true>>login
    res.render("login.ejs");
  } else {
    next();
  }
};

//*****資料庫引入 ******/
//1. 連接資料夾內studentDB (module 匯出物件)
const mongoose = require("mongoose");
const Message = require("./models/message");
const User = require("./models/user");
const url = process.env.URL;
//2.連結資料庫  tryDB是要導入網頁的資料庫名稱，可以改
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conected to MongoDB.");
  })
  .catch((err) => {
    console.log("connection failed.");
    console.log(err);
  });

//******* 留言板內容 ******/
app.get("/addmessage", (req, res) => {
  res.render("addmessage.ejs");
});

app.post("/addmessage", async (req, res, next) => {
  console.log(req.body);
  let { topic, content } = req.body;
  try {
    let newMessage = await new Message({ topic, content });
    newMessage
      .save()
      .then(() => {
        console.log("Data has been saved");
        console.log(newMessage);
        res.render("addmessage.ejs");
      })
      .catch((e) => {
        res.send("Error!!");
      });
  } catch (err) {
    next(err);
  }
});

app.get("/", async (req, res, next) => {
  try {
    let data = await Message.find();
    console.log(data);
    res.render("messagelist.ejs", { data });
  } catch {
    console.log("Error with finding data.");
  }
});

// app.get("/messagelist/:id", async (req, res, next) => {
//   let { id } = req.params;
//   try {
//     let data = await Message.findById(id); //用objid當路徑找資料findById
//     res.render("messageContent.ejs", { data });
//     //res.send(data);
//   } catch {
//     console.log("Error with finding data.");
//   }
// });

//刪除資料庫內的留言
app.post("/delete/:id", async (req, res) => {
  let { id } = req.params;
  try {
    await Message.deleteOne({ id }).then(() => {
      res.send("Deleted successfully");
    });
  } catch {
    console.log("Delete failed");
  }
});

//******* 後台登入 ******/
//創造註冊頁面
app.get("/signup", (req, res) => {
  res.render("login.ejs");
});

//post 註冊表單(error 處理是否重複>>存入DB)
app.post("/signup", async (req, res, next) => {
  // console.log(req.body);
  let { username, password } = req.body;

  try {
    let foundUser = await User.findOne({ username });
    if (foundUser) {
      res.render("reSignup");
    } else {
      bcypt.genSalt(salRounds, (err, salt) => {
        if (err) {
          next(err);
        }
        console.log("this salt is" + salt);
        bcypt.hash(password, salt, (err, hash) => {
          if (err) {
            next(err);
          }
          console.log("hash value is" + hash);
          let newUser = new User({ username, password: hash });
          try {
            newUser
              .save()
              .then(() => {
                res.render("login");
              })
              .catch((e) => {
                res.send("Error!!");
              });
          } catch (err) {
            naxt(err);
          }
        });
      });
    }
  } catch (err) {
    next(err);
  }
});

//創造登入頁面
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

//post 登入表單(error 是否符合DB >> 成功登入)
app.post("/login", async (req, res, next) => {
  let { username, password } = req.body;
  try {
    let foundUser = await User.findOne({ username });
    if (foundUser) {
      //founderUser >>有找到
      bcypt.compare(password, foundUser.password, (err, result) => {
        if (err) {
          next(err);
        }
        if (result === true) {
          req.session.isVerified = true;
          res.redirect("/megManagement");
        } else {
          res.render("reLogin");
        }
      });
    } else {
      res.render("reLogin");
    }
  } catch (e) {
    next(e);
  }
});

//維持登入狀態
app.get("/megManagement", requireLogin, async (req, res) => {
  try {
    let data = await Message.find();
    console.log(data);
    res.render("megManagement.ejs", { data });
  } catch {
    console.log("Error with finding data.");
  }
});

//******* error handling ******/
app.get("/*", (req, res) => {
  res.status(400).send("404 not found");
});

app.use(function (err, req, res, next) {
  console.log(err);
  res.status(500).send("Something broke! We will fix it soon");
});

app.listen(PORT, () => {
  console.log("Server running on port 3000.");
});

//取值方式1: req.params (對路徑取值，{name:name}) ps.req.params.name >>"string"
//取值方式2: req.params (對表單取值，{username:ella}) ps.用於GET表單
//取值方式3: req.body (對表單取值，{username:ella}) ps.用於POST表單，需要bodyparser(moudle)
