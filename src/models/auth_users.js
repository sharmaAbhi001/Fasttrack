import mongoose ,{Schema} from "mongoose";
import bcrypt from "bcrypt"



const userAuthSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ["systemAdmin", "tenantUser"],
    required: true,
  },

  status: {
    type: String,
    enum: ["active", "blocked"],
    default: "active",
  },

},{ timestamps: true });


userAuthSchema.pre("save", async function () {
  if (!this.isModified("password")) return ;
 try {
   const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

 } catch (error) {
  throw(error)
 }
});

export const UserAuth = mongoose.models.UserAuth || mongoose.model("UserAuth", userAuthSchema);
