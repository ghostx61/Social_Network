var express  = require("express");
var app      = express();
var mongoose =require("mongoose");
var passport =require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");

var Post = require("./models/post");
var Image = require("./models/image");
var User = require("./models/user");


app.set("view engine", "ejs");

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/mongoDemo_v6");


//passport config
app.use(require("express-session")({
    secret: "dsadsfjfgjhfghfdjhfgjgdhjkg",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// //create new user
// User.create({
//     name: "ninad",
//     username: "ghostx61",
//     email: "abc@gmail.com",
//     password: "pass"
// }, function(err, user){
//     console.log(user);
// });

// //create new post and associate to user
// User.findOne({name: "ninad"}, function(err, foundUser){
//     const id = foundUser._id;
//     const username = foundUser.username;
//     var author ={id: id, username: username};
//     Post.create({content: "Your Status Tomorrow", author:author}, function(err, post){
//     User.findOne({name: "ninad"}, function(err, foundUser){
//         foundUser.posts.push(post);
//         foundUser.save(function(err, data){
//             console.log(data);
//         })
//     });
// });
// });

// //create new image and associate to user
// User.findOne({name: "ninad"}, function(err, foundUser){
//     const id = foundUser._id;
//     const username = foundUser.username;
//     var author ={id: id, username: username};
//     Image.create({
//         title: "New Image no. 2", 
//         imageURL:"https://www.google.com/url?sa=i&source=images&cd=&ved=2ahUKEwj_zvTA26zjAhUEfSsKHchqDjwQjRx6BAgBEAU&url=https%3A%2F%2Fwww.pexels.com%2Fsearch%2Fbeauty%2F&psig=AOvVaw20L1-Wis0S1SfrMa5urNX1&ust=1562929294093295",
//          author:author
//         }, function(err, image){
//     User.findOne({name: "ninad"}, function(err, foundUser){
//         foundUser.images.push(image);
//         foundUser.save(function(err, data){
//             console.log(data);
//         })
//     });
// });
// });

// //Show user 
// User.findOne({name: "ninad"}).populate("posts").populate("images").exec(function(err, user){
//     console.log(user); 
// });






//======
//ROUTES
//======

app.get("/", function(req, res){
    res.render("index");
});

//signup
app.get("/signup", function(req, res){
    res.render("signup");
});

//login
app.get("/login", function(req, res){
    res.render("login");
});

app.get("/secret", isLoggedIn, function(req, res){
    res.render("secret");
});

//user signup
app.post("/signup", function(req, res){
    var user ={
        name: req.body.name,
        email: req.body.email,
        username: req.body.username
    }
    User.register(user, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.redirect("/signup");
        }
        passport.authenticate("local")(req, res, function(){
        res.redirect("/profile");
        });
    });
});

//user login
app.post("/login", passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login"
}), function(req, res){

});

//user logout
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/secret");
});

//user posts
app.get("/profile", isLoggedIn, function(req, res){
    User.findOne({username: req.user.username}).populate("posts").populate("images").exec(
        function(err, currentUser){
            if(err){
                console.log(err);
            }else{
                var postTime = [];
                for(let i=currentUser.posts.length-1; i>=0; i--){
                    postTime.push(currentUser.posts[i].createdAt.getTime());
                }
                for(let i=currentUser.images.length-1; i>=0; i--){
                    postTime.push(currentUser.images[i].createdAt.getTime());
                }
                postTime.sort(function(a, b) {
                    return b - a;
                });
                console.log(postTime);
                res.render("profile" , {currentUser: currentUser, postTime: postTime});
            }
        }
    );
});

//add new post (post route)
app.post("/post", function(req, res){
    var currentUser = req.user;
    var author ={
        id: req.user._id,
        username: req.user.username
    }
    Post.create({content: req.body.content, author: author}, function(err, post){
        currentUser.posts.push(post);
        currentUser.save(function(err, data){
            if(err){
                console.log(err);
            }else{
                console.log(data);
                res.redirect("/profile");
            }
        })
    });
});

//add new image (post route)
app.post("/image", function(req, res){
    var currentUser =req.user;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    Image.create({
        title: req.body.title,
        imageURL: req.body.imageURL,
        author: author
    }, function(err, image){
        currentUser.images.push(image);
        currentUser.save(function(err, data){
            if(err){
                console.log(err);
            }else{
                console.log(data);
                res.redirect("/profile");
            }
        })
    })
});

app.listen(3000, function(){
    console.log("Server running on port 3000");
});

//middleware
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}
