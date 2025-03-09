import multer from "multer";
import fs from "node:fs/promises";
import path from "path";
import {
  deleteFile,
  deleteFolder,
  getDrive,
  getFolder,
  addFolder,
  getFolderPath,
  saveFile,
  renameFolder,
  getFile,
  renameFile,
  folderExists,
  filerExists,
} from "../db/queries.js";

//---------- Load Pages ----------

const redirectRoot = (req, res) => {
  if (!req.user) {
    res.redirect("/log-in");
    return;
  } else {
    res.redirect("/drive/home");
  }
};

const homepageGet = async (req, res) => {
  const myDrive = await getDrive(req.user.id);
  res.locals.currentDirId = myDrive.id;
  res.render("index");
};

const myDriveGet = async (req, res) => {
  const myDrive = await getDrive(req.user.id);
  res.locals.currentDirId = myDrive.id;
  res.render("folders", {
    title: "My Drive",
    folders: myDrive.children,
    files: myDrive.files,
  });
};

const folderGet = async (req, res) => {
  const folder = await getFolder(req.params.id, req.user.id);
  res.locals.currentDirId = req.params.id;
  if (!folder || !folder.parentId) {
    return res.redirect("/drive/my-drive");
  }
  res.render("folders", {
    title: folder.name,
    folders: folder.children,
    files: folder.files,
    parentId: folder.parentId,
  });
};

const editFolderGet = async (req, res) => {
  const { id } = req.params;
  const folder = await getFolder(+id);
  res.render("editFolder", { folder });
};

const editFileGet = async (req, res) => {
  const { id } = req.params;
  const file = await getFile(+id);
  res.render("editFile", { file });
};

//---------- Create & Upload functions ----------

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const folderPath = await getFolderPath(+req.params.folderId);
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const uploadPost = [
  upload.single("file"),
  async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).send("No file uploaded.");
    }

    const { filename, size, mimetype } = req.file;
    const folderId = +req.params.folderId;
    const ownerId = +req.user.id;
    const fileInfo = {
      filename,
      size,
      mimetype,
      folderId,
      ownerId,
    };
    try {
      await saveFile(fileInfo);
      console.log("File uploaded and saved successfully!");
      res.redirect("/drive/folders/" + folderId);
    } catch (err) {
      console.log("File upload and save unsuccessful!");
      res.redirect("/drive/folders/" + folderId);
    }
  },
];

const createDirPost = async (req, res) => {
  const name = req.body.folder;
  const parentPath = await getFolderPath(+req.params.parentId);
  const path = parentPath + "/" + name.split(" ").join("-");
  console.log("Path: ", path);
  try {
    await fs.mkdir(path);
    console.log("Directory created successfully!");
  } catch (err) {
    console.log(`${name} already exists.`, err.message);
    res.redirect(req.get("referer"));
    return;
  }
  await addFolder(name, +req.params.parentId, req.user.id);
  res.redirect(req.get("referer"));
};

//---------- Update functions ----------

const renameFolderPost = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const folder = await getFolder(id);
  const exists = await folderExists(name, folder.parentId);
  if (exists) {
    console.log("Folder already exists!");
    res.redirect("/drive/folders/" + folder.parentId);
    return;
  }

  try {
    await renameFolder(name, id);
    const path = await getFolderPath(folder.parentId);
    const oldPath = path + "/" + folder.name.split(" ").join("-");
    const newPath = path + "/" + name.split(" ").join("-");
    fs.rename(oldPath, newPath);
    res.redirect("/drive/folders/" + folder.parentId);
  } catch (err) {
    console.log(err);
    res.redirect("/drive/folders/" + folder.parentId);
  }
};

const renameFilePost = async (req, res) => {
  const { id } = req.params;
  const { filename } = req.body;
  const file = await getFile(+id);
  const exists = await filerExists(filename, file.folderId);
  if (exists) {
    console.log("File already exists!");
    res.redirect("/drive/folders/" + file.folderId);
    return;
  }
  try {
    const path = await getFolderPath(file.folderId);
    const oldPath = path + "/" + file.filename.split(" ").join("-");
    const newPath = path + "/" + filename.split(" ").join("-");
    fs.rename(oldPath, newPath);
    await renameFile(filename, id);
    res.redirect("/drive/folders/" + file.folderId);
  } catch (err) {
    console.log(err);
    res.redirect("/drive/folders/" + file.folderId);
  }
};

//---------- Delete functions ----------

const deleteFolderPost = async (req, res) => {
  const { id } = req.params;
  try {
    const path = await getFolderPath(+id);
    fs.rm(path, { recursive: true, force: true });

    const delFolder = await deleteFolder(+id);

    const folder = await getFolder(delFolder.parentId, req.user.id);

    res.redirect("/drive/folders/" + folder.id);
    return;
  } catch (err) {
    console.log(err);
    res.redirect("/drive/my-drive");
  }
};

const deleteFilePost = async (req, res) => {
  const { id } = req.params;
  try {
    const delFile = await deleteFile(+id);

    const path = await getFolderPath(delFile.folderId);
    const filepath = path + "/" + delFile.filename;
    fs.rm(filepath, { recursive: true, force: true });

    const folder = await getFolder(delFile.folderId, req.user.id);

    res.redirect("/drive/folders/" + folder.id);
    return;
  } catch (err) {
    console.log(err);
    res.redirect("/drive/my-drive");
  }
};

export {
  homepageGet,
  redirectRoot,
  myDriveGet,
  folderGet,
  editFolderGet,
  editFileGet,
  renameFolderPost,
  renameFilePost,
  deleteFolderPost,
  deleteFilePost,
  uploadPost,
  createDirPost,
};
