const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const ejs = require("ejs");
const fs = require("fs");
const nodemailer = require("nodemailer");
const app = express();

app.use(bodyParser.json());
app.use(methodOverride("_method"));
const conn = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/world-financial-group"
);
let gfs;
conn.once("open", () => {
  // Init Stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// create storage engine
const storage = new GridFsStorage({
  url: "mongodb://127.0.0.1:27017/world-financial-group",
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      res.render(__dirname + "/views/", { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/jpg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render(__dirname + "/views/", { files: files });
    }
  });
});
app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

// @route GET /files
// @desc  Display all files in JSON
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist"
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists"
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists"
      });
    }

    // Check if image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an image"
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect("/");
  });
});

app.get("/help", (req, res) => {
  res.send([{ name: "Yousuf" }, { name: "Rafae" }]);
});

app.get("/about", (req, res) => {
  res.send("<h1>About</h1>");
});

app.get("/weather", (req, res) => {
  res.send({ forcast: "It is cloudy", location: "karachi" });
});

app.post("/send", async function(req, res) {
  let fileName = "welcome.ejs";
  await fs.exists(__dirname + "/views/" + fileName, async exists => {
    if (exists) {
      console.log("exists", exists);
      await ejs.renderFile(
        __dirname + "/views/" + fileName,
        { Data: "" },
        async (err, output) => {
          var smtpTransport = nodemailer.createTransport({
            //  service: "gmail",
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          let mailOptions = {
            from: process.env.EMAIL, // sender address
            to: "muhammadyousuf327@gmail.com", // list of receivers
            subject: "Sending Email using Node.js",
            text: "That was easy!",
            html: output // html body
          };
          smtpTransport.sendMail(mailOptions, function(error, response) {
            if (error) {
              console.log(error);
              res.end("error", error);
            } else {
              console.log("Message sent: " + response);
              res.end("sent");
            }
          });
        }
      );
    }
  });
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
