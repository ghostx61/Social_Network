var mongoose =require("mongoose");

var ImageSchema = new mongoose.Schema({
    title: String,
    imageURL: String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        username: String
    },
    createdAt: {type:Date, default:Date.now}
});
module.exports= mongoose.model("Image", ImageSchema);