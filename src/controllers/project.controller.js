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
  try {
    const { projectId } = req.params;
    const { tenantId } = req.userData;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    const project = await Project.findOne({ _id: projectId, tenantId });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Project details retrieved successfully",
      data: project
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export const getAllProjects = async (req, res) => {
  try {
    const { tenantId } = req.userData;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    const projects = await Project.find({ tenantId }).select("_id name location startDate endDate status");

    if (!projects) {
      return res.status(404).json({ success: false, message: "No projects found" });
    }

    return res.status(200).json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
