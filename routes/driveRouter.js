import { Router } from "express";
import {
  deleteFilePost,
  deleteFolderPost,
  folderGet,
  homepageGet,
  myDriveGet,
  redirectRoot,
  createDirPost,
  uploadPost,
} from "../controllers/driveControllers.js";

const driveRouter = Router();

driveRouter.get("/", redirectRoot);
driveRouter.get("/drive", redirectRoot);
driveRouter.get("/drive/home", homepageGet);

driveRouter.post("/drive/folders/:parentId", createDirPost);
driveRouter.get("/drive/my-drive", myDriveGet);
driveRouter.get("/drive/folders/:id", folderGet);
driveRouter.post("/drive/folders/delete/:id", deleteFolderPost);

driveRouter.post("/drive/files/upload/:folderId", uploadPost);
driveRouter.post("/drive/files/delete/:id", deleteFilePost);

export { driveRouter };
