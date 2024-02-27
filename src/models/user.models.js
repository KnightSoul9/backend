import mongoose,{Schema} from "mongoose";
import jwt  from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt"

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true //enabling index makes searching more easier in database
    },
    fullName:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true,
    },
    avatar:{
        type:String,//cloudinary url
        required:true,
    },
    coverImage:{
        type:String,
        required:true,
    },
    watchHistory:[
        {//for watch history we will store the video id of each video that user watched 
        type:Schema.Types.ObjectId,
        ref:"video",
        required:true,
       }
    ],
    password:{
        type:String,
        required:[true,'Password is required'],
    },
    refreshToken:{
        type:String
    }
},{timestamps:true})
//here we are encrypting the password after the user gives us
userSchema.pre("save",async function(next){
    if (this.isModified("password")) return next();
    this.password =await bcrypt.hash(this.password,10)    
    next()
})
//here we are comparing the password with the database is right or wrong 
//encryption is a heavy task so we use async await 
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password,this.password)
}
//later in video 
//Generate tokens are short live tokens 
//Access tokens are used to validate the user 
userSchema.methods.generateAccessToken = function(){//Here we are generating the access token
    return jwt.sign({
        id: this._id, //we are accessing these values from database using the this function
        email: this.email, 
        username:this.username,
        fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn:process.env.ACCESS_TOKEN_EXPIRY})
}
//Refresh token is long live tokens 
//Refresh tokens are used when the session is expired it is used to authenticate it is 
//saved in database and user too have and we match these token then it provides a new access token 
userSchema.methods.generateRefreshToken = function(){//here we are generating refresh token 
    return jwt.sign({
        id: this._id, //we are accessing these values from database using the this function
        email: this.email, 
        username:this.username,
        fullName:this.fullName
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn:process.env.REFRESH_TOKEN_SECRET})
}
export const User = mongoose.model("User",userSchema)