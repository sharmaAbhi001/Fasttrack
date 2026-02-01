import { Project } from "../models/project.js";

export const createProject = async (req, res) => {
  // get project data

  const { projectName, location, startDate, endDate } = req.body;
  const { tenantId } = req.userData;

  try {
 
    if(!tenantId){
      return res.status(400).json({success: false, message: "Tenant not found"});
    }
    
    const project = await Project.create({
      tenantId,
      name: projectName,
      location,
      startDate,
      endDate,
      status: "active",
    });

    if (!project) {
      return res
        .status(400)
        .json({ success: false, message: "Project not created" });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Project created successfully",
        project,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


export const getProject = async (req,res) =>{

}
