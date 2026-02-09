import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    required: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkIn: { type: Date },
  checkOut: { type: Date },
  workingHours: { type: Number },
  overTime: { type: Number },
  status: {
    type: String,
    enum: ["Present", "Absent", "HalfDay", "Late"],
    default: "Present",
  },
},{ timestamps: true });



/* Normalize date */
attendanceSchema.pre("save", function(next){
  this.date.setHours(0,0,0,0);

  if(this.checkIn && this.checkOut){
    this.workingHours =
      (this.checkOut - this.checkIn)/(1000*60*60);
  }

  // Set attendance status and overtime based on working hours
  if(this.workingHours){
    if(this.workingHours > 8){
      // More than 8 hours: mark as Present and set overtime
      this.status = "Present";
      this.overTime = this.workingHours - 8;
    } else if(this.workingHours < 8){
      // Less than 8 hours: mark as HalfDay
      this.status = "HalfDay";
      this.overTime = 0;
    } else {
      // Exactly 8 hours: mark as Present, no overtime
      this.status = "Present"; 
      this.overTime = 0;
    }
  }

});

/* One record per day */
attendanceSchema.index(
  { tenantId:1, workerId:1, date:1 },
  { unique:true }
);

/* Faster reports */
attendanceSchema.index({
  tenantId:1,
  projectId:1,
  date:1
});

export const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);