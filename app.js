var express  = require("express");
var app      = express();
var mongoose =require("mongoose");
var passport =require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var methodOverride =require("method-override");
var flash =require("connect-flash");

var Comment=require("./models/comment");
var Post = require("./models/post");
var User = require("./models/user");


require('dotenv').config()
app.use(express.static(__dirname +"/public"));
app.use(methodOverride("_method"));
app.locals.moment = require('moment');

app.set("view engine", "ejs");
app.use(flash());

//for jquery
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
var $ = require("jquery")(window);

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

//cloudinary config
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'ghostx61', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

app.use(function(req, res, next){
    res.locals.message= req.flash("error");
    next();
})


//======
//ROUTES
//======

app.get("/", isLoggedIn, function(req, res){
    var currentUser =req.user;
    //lean()- convert mongoose document to plain js object 
    User.find({_id:{$in: currentUser.follow}}).populate("posts").lean()
    .exec(function(err, users){
        var postArray=[];
        for(let user of users){
            for(let post of user.posts){
                post.profilePic = user.image; 
            }
            postArray= postArray.concat(user.posts);
        }
        //sort post by time
        postArray.sort(function(a, b){
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
        //pagination
        var perPage = 6;
        var pageQuery = parseInt(req.query.page);
        var pageNumber = pageQuery ? pageQuery : 1;
        var postArr = [];
        var count = Math.ceil(postArray.length / perPage);
        if(postArray.length>6){
            var loopIndex =((pageNumber-1)*6);
            for(let i=loopIndex; i<=loopIndex+5; i++){
                if(!postArray[i])
                    break;
                postArr.push(postArray[i]);
            }
        }else{
            postArr=postArray;
        }
        res.render("index", {posts: postArr, userId: currentUser._id, User: req.user, page:"index", current: pageNumber, pages: count});
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
            req.flash("error", err.message);
            return res.redirect("/signup");
        }
        passport.authenticate("local")(req, res, function(){  
        res.redirect("/profile/"+req.user.username);
        });
    });
});

//user login
app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}), function(req, res){

});

//user logout
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/login");
});

//user posts
app.get("/profile/:username", isLoggedIn, function(req, res){
    User.findOne({username: req.params.username}).populate('posts').lean().exec(
        function(err, foundUser){
            if(err && foundUser){
                console.log(err);
                req.flash("error", err.message);
                res.redirect("back");
            }else{
                // follow status
                var status=false;
                for(let follow of req.user.follow){ 
                    if(follow == foundUser._id)
                        status=true;
                }
                var posts =[];
                //post in order of time
                for(let i=foundUser.posts.length-1; i>=0; i--){
                    posts.push(foundUser.posts[i]);
                }
                foundUser.posts=posts;

                //pagination
                var perPage = 6;
                var pageQuery = parseInt(req.query.page);
                var pageNumber = pageQuery ? pageQuery : 1;
                var userPostArr = [];
                var count = Math.ceil(foundUser.posts.length / perPage);
                if(foundUser.posts.length>6){
                    var loopIndex =((pageNumber-1)*6);
                    for(let i=loopIndex; i<=loopIndex+5; i++){
                        if(!foundUser.posts[i])
                            break;
                        userPostArr.push(foundUser.posts[i]);
                    }
                    foundUser.posts=userPostArr;
                }
                res.render("profile" , {user: foundUser, userId: req.user._id, following:status, User: req.user, current: pageNumber, pages: count});
            }
        }
    );
});

//add new post (post route)
app.post("/post", isLoggedIn, upload.single('image'), async function(req, res){
    var currentUser =req.user;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newPost= {
        text: req.body.text,
        image: "",
        author: author
    }
    try{
        //add image if image file uploaded
        if(req.file){
            var result= await cloudinary.v2.uploader.upload(req.file.path);
            newPost.image= result.secure_url;
            newPost.imageId= result.public_id
        }
        var post= await Post.create(newPost);
        currentUser.posts.push(post);
        await currentUser.save();
        res.redirect("back");
    }catch(err){
        console.log(err);
        req.flash("error", err.message);
        res.redirect("back");
    }
});

app.get("/findFriends", isLoggedIn, function(req, res){
    var result= 0;
    if(req.query.search){
        //search
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        User.find({
            $and: [
                 { _id: {$ne: req.user._id} },
                 { $or: [
                       {fname: regex,}, {lname: regex}, {username:regex}
                 ]},
             ]
     }, function(err, allusers){
            if(err){
                console.log(err);
                req.flash("error", err.message);
                res.redirect("back");
            }else{
                if(allusers.length < 1){
                    result=1;
                }
                res.render("users", {allusers: allusers, User: req.user, result: result, page:"users"});
            }
        });
    }
    else{
        let allusers=[];
        result=2;
        res.render("users", {allusers: allusers, User: req.user, result: result, page:"users"});
    }
});

app.post("/follow/:id", function(req, res){
    User.findById(req.params.id, function(err, followingUser){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        // following user's ID in follower user
        followingUser.followers.push(mongoose.Types.ObjectId(req.user._id));
        followingUser.save();
        // follower user's ID in following user
        req.user.follow.push(mongoose.Types.ObjectId(req.params.id));
        req.user.save(function(err){
            if(err){
                console.log(err);
                req.flash("error", err.message);
                res.redirect("back");
            }else{
                res.redirect("back");
            }
        });
    });
    
});

app.post("/unfollow/:id", function(req, res){
    User.findById(req.params.id, function(err, followingUser){
        var index=followingUser.followers.indexOf(req.user._id);
        followingUser.followers.splice(index,1);
        followingUser.save();
        var index=req.user.follow.indexOf(req.params.id);
        req.user.follow.splice(index,1);
        req.user.save(function(err){
            if(err){
                console.log(err);
                req.flash("error", err.message);
                res.redirect("back");
            }else{
                res.redirect("back");
            }
        });
    });
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
                    req.flash("error", err.message);
                    res.redirect("back");
                }else{
                    res.send({postID: post._id});
                }
            });
        }
    });
});

app.get("/post/:postId/unlike", function(req, res){
    Post.findById(req.params.postId, function(err,foundPost){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        }else{
            var index = foundPost.likes.indexOf(req.user._id);
            foundPost.likes.splice(index,1);
            foundPost.save(function(err){
                if(err){
                    console.log(err);
                    req.flash("error", err.message);
                    res.redirect("back");
                }else{
                    res.send({postID: foundPost._id});
                }
            });  
        }
    });
});

app.get("/post/:postId/comments", isLoggedIn, function(req, res){
    Post.findById(req.params.postId).populate('comments').exec(function(err, newPost){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        }else{
            User.findById(newPost.author.id, function(err, user){
                var pic = user.image;
                res.render("comment", {post: newPost, User: req.user, pic:pic});
            });
        }
    });
}); 

app.post("/post/:postId/comment", function(req, res){
    Post.findById(req.params.postId, function(err, post){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        }else{
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    console.log(err);
                    req.flash("error", err.message);
                res.redirect("back");
                }else{
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    post.comments.push(comment);
                    post.save();
                    res.redirect("/post/"+post._id+"/comments"); 
                }
            });  
        }
         
    });
});

app.get("/profile/:username/edit", profileOwnership, function(req, res){
    User.findOne({username: req.params.username}, function(err, user){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        }else{
            res.render("profileEdit", {user: user, User: req.user});
        }
    });
});

app.put("/profile/:username", upload.single('image'), function(req, res){
    User.findOne({username: req.params.username}, async function(err, newUser){
            if(err){
                console.log(err);
                req.flash("error", err.message);
                res.redirect("back");
            }else{
                if(req.file){
                    try{
                        if(newUser.imageId){
                            await cloudinary.v2.uploader.destroy(newUser.imageId);
                        }
                        var result = await cloudinary.v2.uploader.upload(req.file.path);
                        newUser.image = result.secure_url;
                        newUser.imageId = result.public_id;
                    }
                    catch(err){
                        console.log(err);
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                }
                newUser.fname = req.body.fname;
                newUser.lname = req.body.lname;
                newUser.email = req.body.email;
                newUser.bio = req.body.bio;
                newUser.address = req.body.address;
                newUser.dob = req.body.dob;
                newUser.save();
                res.redirect("/profile/"+req.params.username);
            }
    });
});

//account delete 
app.delete("/profile/:username", profileOwnership, async function(req, res){
    try{
        var user= await User.findOne({username: req.params.username}).populate('posts');
        var posts_id=[] ,comments_id=[],image_id=[];
        for(let post of user.posts){
            posts_id.push(post._id);
            comments_id= comments_id.concat(post.comments);
            //image ids for cloudinary delete
            if(post.image!='')
                image_id.push(post.imageId);
        }
        //add user profile image as well 
        image_id.push(user.imageId);
        //delete images from cloudinary
        await cloudinary.v2.api.delete_resources(image_id);

        var followingUsers= await User.find({_id:{$in: user.follow}});        
        for(let u of followingUsers){
            var index=u.followers.indexOf(user._id.toString());
            u.followers.splice(index,1);
            await u.save();
        }
        
        var followerUsers= await User.find({_id:{$in: user.followers}});      
        for(let u of followerUsers){
            var index=u.follow.indexOf(user._id.toString());
            u.follow.splice(index,1);
            await u.save();
        }
        
        Promise.all([
            User.deleteOne({username: user.username}),
            Post.deleteMany({_id: { $in: posts_id}}),
            Comment.deleteMany({_id: { $in: comments_id}})
        ]).then(function(){
            res.redirect("/login");
        });
        
    }catch(err){
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("back");
    }
});

app.delete("/post/:postId", async function(req, res){
    try{
        var post= await Post.findByIdAndDelete(req.params.postId);
        await Comment.deleteMany({_id: { $in: post.comments}});
        if(post.image!='')
            await cloudinary.v2.uploader.destroy(post.imageId);
        res.redirect("back");    
    }catch(err){
        console.log(err);
        req.flash("error", err.message);
        res.redirect("back");
    } 
});


app.listen(3000, function(){
    console.log("Server running on port 3000");
});

//middleware
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in");
    res.redirect("/login");
}

function profileOwnership(req, res, next){
    if(req.isAuthenticated()){
        if(req.user.username === req.params.username)
        return next();
    }
    req.flash("error", "Something went wrong");
    res.redirect("back");
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

