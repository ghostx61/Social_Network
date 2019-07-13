var mongoose =require("mongoose");

var PostSchema = new mongoose.Schema({
    text: String,
    image: String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        username: String
    },
    createdAt: {type:Date, default:Date.now}
});
module.exports= mongoose.model("Post", PostSchema);