var express  = require("express");
var app      = express();
var mongoose =require("mongoose");
var passport =require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var methodOverride =require("method-override");

var Comment=require("./models/comment");
var Post = require("./models/post");
var User = require("./models/user");


app.use(express.static(__dirname +"/public"));
app.use(methodOverride("_method"));
app.locals.moment = require('moment');

app.set("view engine", "ejs");

//for jquery
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
var $ = require("jquery")(window);

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/mongoDemo_v7");


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


//======
//ROUTES
//======

app.get("/", isLoggedIn, function(req, res){
    var currentUser =req.user;
    //console.log(currentUser.follow);
    User.find({_id:{$in: currentUser.follow}}).populate("posts").exec(function(err, users){
        var postArray=[];
        for(let user of users){
            postArray= postArray.concat(user.posts);
        }
        postArray.sort(function(a, b){
            return b.createdAt.getTime() - a.createdAt.getTime();
          });
        res.render("index", {posts: postArray, userId: currentUser._id});
    });
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
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        username: req.body.username
    }
    User.register(user, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.redirect("/signup");
        }
        passport.authenticate("local")(req, res, function(){
         console.log(req.user.username);   
        res.redirect("/profile/"+req.user.username);
        });
    });
});

//user login
app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
}), function(req, res){

});

//user logout
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/secret");
});

//user posts
app.get("/profile/:username", isLoggedIn, function(req, res){
    User.findOne({username: req.params.username}).populate("posts").exec(
        function(err, foundUser){
            if(err && foundUser){
                console.log(err);
            }else{
                var status=false;
                for(let follow of req.user.follow){ 
                    if(follow == foundUser._id)
                        status=true;
                }
                res.render("profile" , {User: foundUser, userId: req.user._id, following:status});
            }
        }
    );
});


//add new post (post route)
app.post("/post", function(req, res){
    var currentUser =req.user;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    Post.create({
        text: req.body.text,
        image: req.body.image,
        author: author
    }, function(err, post){
        currentUser.posts.push(post);
        currentUser.save(function(err, data){
            if(err){
                console.log(err);
            }else{
                console.log(data);
                res.redirect("back");
            }
        })
    })
});

app.get("/findUsers", isLoggedIn, function(req, res){
    User.find({}, function(err, allusers){
        if(err){
            console.log(err);
        }else{
            res.render("users", {allusers: allusers, currentUser: req.user});
        }
    });
});

app.post("/follow/:id", function(req, res){
    req.user.follow.push(mongoose.Types.ObjectId(req.params.id));
    req.user.save(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("back");
        }
    })
});

app.post("/unfollow/:id", function(req, res){
    var unfollowedUserId = req.params.id;
    var currentUserIdArray = req.user.follow;
    var index=currentUserIdArray.indexOf(unfollowedUserId);
    req.user.follow.splice(index,1);
    req.user.save(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("back");
        }
    })
});

//like button
app.get("/post/:postId/like", function(req, res){
    console.log("like route");
    Post.findById(req.params.postId, function(err,foundPost){
        if(err){
            console.log(err);
        }else{
            foundPost.likes.push(req.user._id);
            foundPost.save(function(err, post){
                if(err){
                    console.log(err);
                }else{
                    res.send({postID: post._id});
                }
            });
        }
    });
});

app.get("/post/:postId/unlike", function(req, res){
    console.log("unlike route");
    Post.findById(req.params.postId, function(err,foundPost){
        if(err){
            console.log(err);
        }else{
            var index = foundPost.likes.indexOf(req.user._id);
            foundPost.likes.splice(index,1);
            foundPost.save(function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("postid", foundPost._id);
                    res.send({postID: foundPost._id});
                }
            });  
        }
    });
});

app.get("/post/:postId/comments", function(req, res){
    Post.findById(req.params.postId).populate('comments').exec(function(err, newPost){
        if(err){
            console.log(err);
        }else{
            console.log(newPost);
            res.render("comment", {post: newPost});
        }
    });
}); 

app.post("/post/:postId/comment", function(req, res){
    Post.findById(req.params.postId, function(err, post){
        if(err){
            console.log(err);
        }else{
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    console.log(err);
                }else{
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    post.comments.push(comment);
                    post.save();
                    console.log(post);
                    res.redirect("/post/"+post._id+"/comments"); 
                }
            });  
        }
         
    });
});

app.get("/profile/:username/edit", function(req, res){
    User.findOne({username: req.params.username}, function(err, user){
        if(err){
            console.log(err);
        }else{
            res.render("profileEdit", {user: user});
        }
    });
});

app.put("/profile/:username", function(req, res){
    console.log(req.body.user);
    User.findOneAndUpdate({username: req.params.username}, req.body.user, 
        function(err, newUser){
            if(err){
                console.log(err);
            }else{
                console.log(newUser);
                res.redirect("/profile/"+req.params.username);
            }
    });
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
