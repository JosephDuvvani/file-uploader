import { body } from "express-validator";
import { fileExists, folderExists, getFile, getFolder } from "../db/queries.js";

const nameErr = "A file name can't contain any of the following characters: ";

const validateFolderName = [
  body("folder")
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Folder name must be between 1 and 30 characters.")
    .custom(async (value, { req }) => {
      const reg = /[<>:"/\\|?*]/;

      if (reg.test(value)) {
        throw new Error(nameErr + '< > : "/ \\ | ? *');
      }
      let { parentId } = req.params;
      if (!parentId) {
        const { id } = req.params;
        const folder = await getFolder(id);
        parentId = folder.parentId;
      }
      const exists = await folderExists(value, parentId);
      if (exists) throw new Error("Folder with this name already exists.");
    }),
];

const validateFolderRename = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Folder name must be between 1 and 30 characters.")
    .custom(async (value, { req }) => {
      const reg = /[<>:"/\\|?*]/;

      if (reg.test(value)) {
        throw new Error(nameErr + '< > : "/ \\ | ? *');
      }
      const { id } = req.params;
      const folder = await getFolder(id);

      const exists = await folderExists(value, folder.parentId);
      if (exists) throw new Error("Folder with this name already exists.");
    }),
];

const validateFileName = [
  body("filename")
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Folder name must be between 1 and 30 characters.")
    .custom(async (value, { req }) => {
      const reg = /[<>:"/\\|?*]/;

      if (reg.test(value)) {
        throw new Error(nameErr + '< > : "/ \\ | ? *');
      }
      let { id } = req.params;
      const file = await getFile(id);

      const ext = file.filename.split(".").slice(1).join(".");
      const valExt = value.split(".").slice(1).join(".");

      if (valExt !== ext)
        throw new Error("You can't change the file extension.");

      const exists = await fileExists(value, file.folderId);
      if (exists) throw new Error("File with this name already exists.");
    }),
];

export { validateFolderName, validateFolderRename, validateFileName };
