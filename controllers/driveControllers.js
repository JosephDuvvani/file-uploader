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
    title: myDrive.name,
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

    const { filename, path, size, mimetype } = req.file;
    const folderId = +req.params.folderId;
    const folderPath = await getFolderPath(folderId);
    const filepath = folderPath + "/" + filename;
    const ownerId = +req.user.id;
    const fileInfo = {
      filename,
      filepath,
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
  try {
    await fs.mkdir(path);
    console.log("Directory created successfully!");
  } catch (err) {
    console.log(`${name} already exists.`, err.message);
    res.redirect(req.get("referer"));
    return;
  }
  await addFolder(name, +req.params.parentId, req.user.id, path);
  res.redirect(req.get("referer"));
};

//---------- Delete functions ----------

const deleteFolderPost = async (req, res) => {
  const { id } = req.params;
  try {
    const delFolder = await deleteFolder(+id);

    fs.rm(delFolder.path, { recursive: true, force: true });

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

    fs.rm(delFile.filepath, { recursive: true, force: true });

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
  deleteFolderPost,
  deleteFilePost,
  uploadPost,
  createDirPost,
};
