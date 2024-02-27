//this file will register the user 
//to take the request and response we will use this handler 
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.models.js "
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        user.save({validateBeforeSave: false})//here we are storing only the refersh token
        //but the whole moongose data model will get save so we set validatebeforesave to false
        return {refreshToken,accessToken}
    } catch (error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }

}
const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body//req.body is use to get data from frontend like form or inputs
    //and also can give access of the data of middlewares if used before the calling method
    //console.log("email: ", email);

    if (//checking if fields are empty or not  
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
        //Apierror helps in creating all the custom errors we want so we created it as a seperate file  
    }


    //Now check for if user already existed or not we can check the user because the user model is created 
    //by moongose and it can easily access the database 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    //now we are taking the local path of the uploaded avatar on our server     
    const avatarLocalPath = req.files?.avatar[0]?.path;//error in this line-anurag 
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    //checking for avatar
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    //now we are uploading the avatar to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   
    //Now we are adding all of the data to the database and adding will be done by the user model 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })
    //now we are checking that user is added or not,mongodb adds unique ids to all the entry 
    //done into the database so we will use that unique id to check whether user is added or not  
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"//also we are removing these to feel using select syntax 
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async(req, res)=>{
    //access and referesh token generation 
    
    // req body -> data
    // username or email
    const {email, username, password} = req.body
    console.log(email)
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    //find the user
    const user = await User.findOne({//findOne is used to search the data from the database
        $or: [{username},{email}]
    })
    if (!user){
        throw new ApiError(404, "User does not exist")
    }
    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid){
        throw new ApiError(401, "Invalid User Credential")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select ("-password -refreshToken")//here we are excluding the password and refresh token field
    //send cookie
    const options = {//setting these parameters to true enable to change cookies only modified by the server 
        httpOnly : true,
        secure : true
    }
    return res 
    .status(200)
    .cookie("accessToken",accessToken,options)//here we pass access token in form of cookie
    .cookie("refreshToken",refreshToken,options)//here we pass refresh token in form of cookie
    .json(
        new ApiResponse(
            200,
            {//this is in form of json file if user want to store it into his local storage
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully "
        )
    )
})
// Logout user (Here we cannot access the user from the database because earlier we are 
// taking that from the body but here we cannot ask the user to enter the email so we create custom middleware)
const logoutUser = asyncHandler (async(req, res)=>{
    await User.findByldAndUpdate(req.user._id,//here using the findbyIdAndUpdate method because
    //it will find the user by id and set refresh token to undefined 
        {
            $set: {
                refreshToken: undefined
            } 
        },
        
        {
            new:true 
        }
    )
    const options = {//giving this to provide access to edit the cookies 
        httpOnly: true, 
        secure: true
    }
    return res
    .status (200)
    //clearing up the cookies
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

//here we are refreshing the access token when the access token expires then the frontend 
//sends the refresh token then backen check with the database if it matches then the session resumed
const refreshAccessToken = asyncHandler(async(req,res)=>{
    //taking the refresh token either from cookies or from the body 
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    //if tokens is not avialable
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
    //now bringing the decoded token from backend by passing the env files from .env file
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
        )
        //Now we are taking the information from the backend by the id we used while creating refresh token
        const user = await User.findById(decodedToken?._id) 
        if(user ){
            throw new ApiError(401,"Invalid refresh token")
        }
        //now checking for both the token be the same from the token saved in the user 
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used ")
        }
        //now if not present then genertaing the new tokens and storing in the cookies 
        //for accessing the cookies we have to create the options 
        const options = {
            httpOnly: true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
        return res 
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed succesfully "
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
        
    }
})

//Here in this section we are changing the password of a partcular user 
const changeCurrentPassword = asyncHandler(async(req,res)=>{
    //getting the new password and oldpassword from the frontend entered by user 
    const {oldPassword,newPassword} = req.body
    //if user is changing password its mean he is logged in so we can access all the details from backend
    const user = await User.findById(req.User?.id)
    //now we have created the method isPassword correct in the user accessing that method for checking
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old Password")
    }
    //If all ok then change the password 
    user.password = newPassword 
    //Now save everthing 
    await user.save({validateBeforeSave:false})
    return res 
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Succesfully"))
})

//Now here we are accesing the user if he is logged in we passed the user when we were writhing the authmiddleware
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200,req.user,"Current user fetched succesfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName ,email} = req.body
    if(!fullName || !email){
        throw new ApiError(400,"All fields required")
    }
    const user = User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{//set is a function provided by the mongodb
                fullName,//fullName:fullName both ways are right
                email:email
            }
        },
        {new : true}//this is when it is updated then it get returned automatically returned 
        ).select("-password")//remmoving the password from the return varriables 
        return res
        .status(200)
        .json(new ApiResponse(200,user,"Account details updated succesfully"))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path//checking the file path from the multer middleware 
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing ")
    }
    //TODO: delete old image -assignment 
    //Now uploading this file on the cloudinary 
    await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.Url){
        throw new ApiError(400,"Error while uploading avatar")
    }
    //if all ok then upload the file 
    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar image updated succesfully "))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path//checking the file path from the multer middleware 
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing ")
    }
    //Now uploading this file on the cloudinary 
    await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.Url){
        throw new ApiError(400,"Error while uploading cover image")
    }
    //if all ok then upload the file 
    const user =  await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover image updated succesfully "))
})

const getUserChannelProfile =asyncHandler(async(req,res)=>{
    const {username} = req.params//taking the username from the url/params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    //user.aggregate([{},{},{}]) --> {} these are the different aggregation pipelines
    const channel = await User.aggregate([
        {
            $match:{//checking for the username in the database
                username:username?.toLowerCase()
            }
        },
        {
            //Now we are going for the number of subscribers for that we need to access another model subscription
            $lookup:{
                from:"subscriptions",//for accesing the another model convert in all small case and make it pulural
                localField:"_id",
                foreignField:"channel",//if searching for the subscriber then search for the channel and count all document 
                as:"subscribers"
             }
         },
         {  //Now we are going for the nuber of channel subscribed
            $lookup:{
                from:"subscriptions",//for accesing the another model convert in all small case and make it pulural
                localField:"_id",
                foreignField:"subscriber",//if searching for the subscriber then search for the channel and count all document 
                as:"subscribeTo"
             }
         },
         {  //nnow adding all the number of subscriber and number of channel subscribed
            $addFields: {
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribeToCount:{
                    $size:"$subscribeTo"
                },
                //here we are checking for the subscription of the current channel by the user 
                isSubscribed:{
                        $cond:{
                            //for that we are checking the id of user in the array of subscriber 
                            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }
                
            }
         },
         {
            $project:{//project is used to project the value.Which value we want to project simply set it 1
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribeToCount:1,
                isSubscribed:1,
                coverImage:1,
                avatar:1,
                email:1
            }
         }
          
    ])
    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }
    return res
    .status(200)
    .json(200,channel[0],"User channel fetched succesfully")

})

const getWatchHistory = asyncHandler(async(req,res)=>{
    // req.user._id here we get the id which is just a string is not the mongodb id 
    //mongoose convert this id into the mongodb id in the backend
    const user = await User.aggregate([
        {//but when we are writing the aggeregate pipeline then the mongoose not work then
            //we have to manually convert the id 
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {//here we are searching for the videos in the watchhistory model
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                //Here we are writing the subpipeline to access the owner of the video watched by the user
                pipeline:[
                {
                    lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        //here we get all the details of the user so we will project only few data 
                        pipeline:[
                            {
                                project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                },
                {//this for the frontend by adding this we directly pass the owner object from which frontend 
                    //developer can easily takeout the data 
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }

                ]
            }
        }
    ]) 
    return res
    .status(200)
    .json (new ApiResponse((200,user[0].watchHistory,"Watch history fetched succesfully")))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}

