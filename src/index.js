import dotenv from "dotenv"
import connectDB from "./db/index.js"
import {app} from './app.js'
dotenv.config({
    path:'./.env'
})

connectDB()

.then(() => {
    //here we are starting to listen the database bcoz till now we only connected to database
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})
