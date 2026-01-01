import mongoose from "mongoose";

export const initDb = async () => {
  try {
    const dbUrl: string =
      process.env.MongoDB_Connection_String ||
      "mongodb+srv://mrartimas24:medi_quiz@cluster0.ou5w2cm.mongodb.net/";
    if (!dbUrl) {
      throw new Error("Database URL is not defined in environment variables.");
    }

    // await mongoose.connect(dbUrl);
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });


    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};
