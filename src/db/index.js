import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB = async()=>{
    try {
        //connectionInstance will get return an object which have soo much information
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MONGODB CONNECTED !! DB HOST:${connectionInstance.connection.host}`);
        //here we are taking info of DB that we are connected
        //to right DB or not 
        
    } catch (error) {
        console.log("MONGODB connection error",error);
        process.exit(1)//this will exit the current service with value 1 which signifies
        //error
        
    }
}
export default connectDB