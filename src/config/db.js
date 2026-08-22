import mongoose from "mongoose";

export async function connectdb(){
    try {
        await mongoose.connect(process.env.MONGODB_URI);

    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}
