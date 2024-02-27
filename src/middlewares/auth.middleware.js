import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"

export const verifyJWT = asyncHandler (async (req, _,//here res was not getting used so we used _
next) =>{
//here we are taking the access of the cookies and checking for the access or bearer token 
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new ApiError(401,"Unautrized request")
            }
        //now we are decoding the acccess token to get the _id of the user which we defined in the
        //user model 
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            const user = await User.findById(decodedToken?._id).select("-password , -refreshToken")//we removed -password , -refreshToken
    
        if (!user) {
                //  NEXT_VIDEO: discuss about frontend
                throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user;//adding the user information 
        next ()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
        
    }
})