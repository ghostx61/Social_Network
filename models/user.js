var mongoose =require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    username: String,
    password: String,
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
    images:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Image"   
        }
    ]
});
UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);