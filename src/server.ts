import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";

connectDB();

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
