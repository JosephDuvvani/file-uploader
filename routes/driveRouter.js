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
  renameFolderPost,
  renameFilePost,
  editFolderGet,
  editFileGet,
  fileDetailsGet,
  downloadFilePost,
} from "../controllers/driveControllers.js";

const driveRouter = Router();

driveRouter.get("/", redirectRoot);
driveRouter.get("/drive", redirectRoot);
driveRouter.get("/drive/home", homepageGet);

driveRouter.post("/drive/folders/:parentId", createDirPost);
driveRouter.get("/drive/my-drive", myDriveGet);
driveRouter.get("/drive/folders/:id", folderGet);
driveRouter.get("/drive/folders/edit/:id", editFolderGet);
driveRouter.post("/drive/folders/edit/:id", renameFolderPost);
driveRouter.post("/drive/folders/delete/:id", deleteFolderPost);

driveRouter.post("/drive/files/upload/:folderId", uploadPost);
driveRouter.get("/drive/files/details/:id", fileDetailsGet);
driveRouter.get("/drive/files/edit/:id", editFileGet);
driveRouter.post("/drive/files/edit/:id", renameFilePost);
driveRouter.post("/drive/files/delete/:id", deleteFilePost);
driveRouter.post("/drive/files/download/:id", downloadFilePost);

export { driveRouter };
