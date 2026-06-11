import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Profile } from "../models/Profile.js";
import { AppSettings } from "../models/AppSettings.js";

async function run() {
  await connectDB();
  const email = "admin@lapadi.local";
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      email,
      passwordHash: await bcrypt.hash("ChangeMe!2026", 10),
      roles: ["admin", "membre"],
    });
    await Profile.create({ user: admin._id, firstName: "Admin", lastName: "La PaDI" });
    console.log("Admin cree:", email, "/ ChangeMe!2026");
  }
  await AppSettings.findOneAndUpdate(
    { key: "singleton" },
    { $setOnInsert: { key: "singleton" } },
    { upsert: true },
  );
  console.log("Seed termine");
  process.exit(0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});