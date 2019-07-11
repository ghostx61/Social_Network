var express  = require("express");
var app      = express();
var mongoose =require("mongoose");


app.set("view engine", "ejs");

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));


app.get("/", function(req, res){
    res.render("index");
});


app.listen(3000, function(){
    console.log("Server running on port 3000");
});
