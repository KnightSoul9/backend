import  express  from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
const app = express()
//now we are defining all the frontend url which can access to the app 
app.use(cors({
    origin :process.env.CORS_ORIGIN,
    Credential:true
}))
//now we are accepting the json file to be uploaded in database
app.use(express.json({limit:"20kb"}))
//now we will take the data which are coming by the URL so for this we need a URL decoder
app.use(express.urlencoded({extended:true, limit:"20kb"}))
//here we are storing some files data in public folder on our own server so we can access we nedded
app.use(express.static("public"))
//now we are setting up to magnage the cookies stored in the User browser and to perform CURD operation on it 
app.use(cookieParser())


//Routes import{This is good practice to import the all files here better than importing in index file}
//Routes import
import userRouter from './routes/user.routes.js'

//routes declaration 
app.use("/api/v1/users", userRouter)//for standard practice we write api then version then route 
//Here we transfer the route to the user route and then we write all other 
//features in the user.routes.js
//http://localhost:8000/api/v1/user


export {app}