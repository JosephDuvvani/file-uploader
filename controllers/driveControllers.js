import fs from "node:fs/promises";
import {
  deleteFile,
  deleteFolder,
  getDrive,
  getFolder,
  addFolder,
  saveFile,
  renameFolder,
  getFile,
  renameFile,
  folderExists,
  fileExists,
  getFolderPath,
  shareFolder,
  getShareDataByFolderId,
} from "../db/queries.js";
import { configDotenv } from "dotenv";
import path from "path";
import {
  upload,
  supabase,
  filePaths,
  renameStorageFolder,
} from "../storage/storage.js";

configDotenv();

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
  try {
    const myDrive = await getDrive(req.user.id);
    res.locals.currentDirId = myDrive.id;
    res.render("index");
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message);
  }
};

const myDriveGet = async (req, res) => {
  try {
    const myDrive = await getDrive(req.user.id);
    res.locals.currentDirId = myDrive.id;
    res.render("folders", {
      title: "My Drive",
      folders: myDrive.children,
      files: myDrive.files,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message);
  }
};

const folderGet = async (req, res) => {
  try {
    const folder = await getFolder(req.params.id, req.user.id);
    res.locals.currentDirId = req.params.id;
    if (!folder.parentId) {
      return res.redirect("/drive/my-drive");
    }
    res.render("folders", {
      title: folder.name,
      folders: folder.children,
      files: folder.files,
      parentId: folder.parentId,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message);
  }
};

const fileDetailsGet = async (req, res) => {
  try {
    const file = await getFile(req.params.id);
    res.render("fileDetails", { file });
  } catch (err) {
    console.log(err);
    res.send("<h1>Cannot find any information about this file!</h1>");
  }
};

const editFolderGet = async (req, res) => {
  const { id } = req.params;
  const folder = await getFolder(id);
  res.render("editFolder", { folder });
};

const editFileGet = async (req, res) => {
  const { id } = req.params;
  const file = await getFile(id);
  res.render("editFile", { file });
};

//---------- Create & Upload functions ----------

const uploadPost = [
  upload.single("file"),
  async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).send("No file uploaded.");
    }

    const fileInfo = {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      folderId: req.params.folderId,
      ownerId: req.user.id,
    };

    try {
      const folderPath = await getFolderPath(fileInfo.folderId);
      const { data, error } = await supabase.storage
        .from("files")
        .upload(folderPath + "/" + file.originalname, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) throw error;

      await saveFile(fileInfo);
      console.log("Upload successful.");
      res.redirect("/drive/folders/" + fileInfo.folderId);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send(err.message);
    }
  },
];

const downloadFilePost = async (req, res) => {
  try {
    const file = await getFile(req.params.id);
    const share = await getShareDataByFolderId(file.folderId);

    if (
      (!share && !req.user) ||
      (!share && req.user && req.use.id !== file.ownerId)
    )
      throw new Error("Cannot download this file.");

    const folderpath = await getFolderPath(file.folderId);

    const { data, error } = await supabase.storage
      .from("files")
      .download(`${folderpath}/${file.filename}`);

    if (error) throw error;

    const tempFilePath = path.join("public", "temp" + file.filename);
    await fs.writeFile(tempFilePath, Buffer.from(await data.arrayBuffer()));

    res.download(tempFilePath, file.filename, (err) => {
      if (err) console.error("File download error:", err);
      fs.unlink(tempFilePath);
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send(err.message);
  }
};

const createDirPost = async (req, res) => {
  const name = req.body.folder;

  try {
    const exists = await folderExists(name, req.params.parentId);
    if (exists) throw new Error("Folder with this name already exists!");
    await addFolder(name, req.params.parentId, req.user.id);
    console.log("Folder created.");
    return res.redirect(req.get("referer"));
  } catch (err) {
    console.error(err.message);
    return res.status(500).send(err.message);
  }
};

//---------- Update functions ----------

const renameFolderPost = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const folder = await getFolder(id);

  try {
    const exists = await folderExists(name, folder.parentId);
    if (exists) throw new Error("Folder with this name already exists.");

    const folderPath = await getFolderPath(folder.parentId);
    await renameStorageFolder(
      `${folderPath}/${folder.name}`,
      `${folderPath}/${name}`
    );

    await renameFolder(name, id);
    console.log("Folder renamed to, ", name);
    res.redirect("/drive/folders/" + folder.parentId);
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message);
  }
};

const renameFilePost = async (req, res) => {
  const { id } = req.params;
  const { filename } = req.body;
  const file = await getFile(id);
  try {
    const exists = await fileExists(filename, file.folderId);
    if (exists) throw new Error("File with this name already exists.");

    const folderPath = await getFolderPath(file.folderId);

    const { error: renameError } = await supabase.storage
      .from("files")
      .move(`${folderPath}/${file.filename}`, `${folderPath}/${filename}`);

    if (renameError) throw renameError;

    await renameFile(filename, id);
    console.log("File renamed to, ", filename);
    res.redirect("/drive/folders/" + file.folderId);
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message);
  }
};

//---------- Delete functions ----------

const deleteFolderPost = async (req, res) => {
  const { id } = req.params;
  try {
    const folderPath = await getFolderPath(id);

    const paths = await filePaths(folderPath);

    if (paths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from("files")
        .remove(paths);

      if (deleteError) throw deleteError;
    }

    const delFolder = await deleteFolder(id);
    console.log("Folder deleted.");
    res.redirect("/drive/folders/" + delFolder.parentId);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send(err.message);
  }
};

const deleteFilePost = async (req, res) => {
  const { id } = req.params;
  try {
    const file = await getFile(id);
    const folderPath = await getFolderPath(file.folderId);

    const { data, error } = await supabase.storage
      .from("files")
      .remove([`${folderPath}/${file.filename}`]);

    if (error) throw error;

    await deleteFile(id);

    console.log("File deleted.");
    res.redirect("/drive/folders/" + file.folderId);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message);
  }
};

//---------- Share ----------

const shareFolderGet = (req, res) => {
  const { id } = req.params;
  res.render("shareFolder", { shareId: id });
};

const shareFolderPost = async (req, res) => {
  const { expireAt } = req.body;
  const { id } = req.params;
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + expireAt * 24);

  try {
    await shareFolder(id, expiryTime);
    await getShareDataByFolderId(id);

    res.render("shareLink", {
      link: `${req.protocol}://${req.get("host")}/share/${id}`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message);
  }
};

const sharedFolderGet = async (req, res) => {
  const { id } = req.params;
  try {
    const share = await getShareDataByFolderId(id);

    if (!share) throw new Error("Cannot find this record.");

    res.render("sharedFolder", {
      title: share.folder.name,
      folders: share.folder.children,
      files: share.folder.files,
      expiryTime: share.expiresAt,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message);
  }
};

const sharedFileDetailsGet = async (req, res) => {
  try {
    const file = await getFile(req.params.id);
    const shared = await getShareDataByFolderId(file.folderId);

    if (!shared) return res.status(400).send("Cannot view file details.");

    res.render("fileDetails", { file });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message);
  }
};

export {
  homepageGet,
  redirectRoot,
  myDriveGet,
  folderGet,
  fileDetailsGet,
  editFolderGet,
  editFileGet,
  renameFolderPost,
  renameFilePost,
  deleteFolderPost,
  deleteFilePost,
  uploadPost,
  createDirPost,
  downloadFilePost,
  shareFolderGet,
  shareFolderPost,
  sharedFolderGet,
  sharedFileDetailsGet,
};
