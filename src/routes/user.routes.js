 import { loginUser, logoutUser, registerUser,refreshAccessToken, 
    changeCurrentPassword, getCurrentUser, updateAccountDetails, 
    updateUserAvatar, updateUserCoverImage, getUserChannelProfile,
     getWatchHistory } from "../controllers/user.controller.js";
 import { Router } from "express";
 import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
 const router = Router()
 //now we are calling the register user and calling the registerUser method
 router.route("/register").post(//Here we are handaling the post method 
    upload.fields([//here we are introducing a middleware before the execution of the registerUser method 
        {//now we are able to send image 
            name: "avatar",
            maxCount: 1
        },
        {
            name:"coverImage",
            maxCount:1
        }

    ]),
    registerUser)//http://localhost:8000/api/v1/users/register
    
 router.route("/login").post(loginUser)

    //secured routes
    //here we are passing two methods in the post method after execution of one the control goes on next 
    //because we have executed the next() in the auth middleware 
 router.route("/logout").post(verifyJWT, logoutUser)
 router.route("/refresh-token").post(refreshAccessToken)
 router.route("/change-password").post(verifyJWT,changeCurrentPassword)//here we are using the verify JWT to check wheather the user is logged in or not 
 router.route("/current-user").post(verifyJWT,getCurrentUser)
 router.route("/update-account").patch(verifyJWT,updateAccountDetails)//here we are using the patch to update a particular thing in the variable
 //here also we will use the verifyJWT to verify that user is logged in first then check for only upload and change 
 //single file avatar we used upload.single 
 router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
 router.route("/cover-image ").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
 //here we are using the params to pass the username into it so for that we are using the /c/:username
 router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
 router.route("/history").get(verifyJWT,getWatchHistory)//we are using get bcoz we are not taking any input here from user 
 
 export default router;

 