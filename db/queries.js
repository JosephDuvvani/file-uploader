import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";

const prisma = new PrismaClient();

//---------- User Queries ----------

const getUserByEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  return user;
};

const addUser = async (user) => {
  const { firstname, lastname, email, password } = user;
  const hashedPwd = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      firstname,
      lastname,
      email,
      password: hashedPwd,
      folders: {
        create: {
          name: "My Drive",
        },
      },
    },
  });

  const name = `My Drive ${newUser.id}`;
  const path = "public/data/" + name.split(" ").join("-");

  await prisma.folder.updateMany({
    where: {
      AND: {
        parentId: {
          equals: null,
        },
        ownerId: {
          equals: newUser.id,
        },
      },
    },
    data: {
      name,
    },
  });

  try {
    await fs.mkdir(path);
  } catch (err) {
    console.log("Folder already exists");
  }
};

//---------- File Queries ----------

const saveFile = async (fileInfo) => {
  const { filename, filepath, size, mimetype, folderId, ownerId } = fileInfo;
  try {
    await prisma.file.create({
      data: {
        filename,
        filepath,
        size,
        mimetype,
        folder: {
          connect: {
            id: folderId,
          },
        },
        owner: {
          connect: {
            id: ownerId,
          },
        },
      },
    });
  } catch (err) {
    console.error("Error saving to database");
  }
};

const getFile = async (id) => {
  const file = await prisma.file.findUnique({
    where: {
      id,
    },
  });
  return file;
};

const renameFile = async (filename, id) => {
  const file = await prisma.file.update({
    where: {
      id: +id,
    },
    data: {
      filename,
    },
  });
  console.log("File edit successful");
};

const deleteFile = async (id) => {
  const deleteFile = await prisma.file.delete({
    where: {
      id,
    },
  });
  console.log("File deleted");
  return deleteFile;
};

//---------- Folder Queries ----------

const addFolder = async (name, parentId, ownerId) => {
  const exists = await prisma.folder.findMany({
    where: {
      name,
      parentId,
    },
  });
  if (exists.length > 0) {
    console.log("Folder already exists!");
  } else {
    await prisma.folder.create({
      data: {
        name,
        parentId,
        ownerId,
      },
    });
    console.log("Directory added to database!");
  }
};

const getDrive = async (ownerId) => {
  try {
    const drive = prisma.folder.findFirst({
      where: {
        AND: {
          parentId: {
            equals: null,
          },
          ownerId: {
            equals: ownerId,
          },
        },
      },
      include: {
        children: true,
        files: true,
      },
    });
    return drive;
  } catch (err) {
    console.log("Drive not found");
  }
};

const getFolder = async (id, ownerId) => {
  try {
    const folder = prisma.folder.findFirst({
      where: {
        AND: {
          id: {
            equals: +id,
          },
          ownerId: {
            equals: ownerId,
          },
        },
      },
      include: {
        children: true,
        files: true,
      },
    });
    return folder;
  } catch (err) {
    console.log("Folder not found");
  }
};

const getFolderPath = async (id) => {
  if (id == null) return "public/data";
  const folder = await prisma.folder.findUnique({
    where: {
      id,
    },
    select: {
      parentId: true,
      name: true,
    },
  });
  const name = folder.name.split(" ").join("-");
  const nameArr = [await getFolderPath(folder.parentId), name];
  return nameArr.join("/");
};

const folderExists = async (name, parentId) => {
  const exists = await prisma.folder.findFirst({
    where: {
      name: {
        equals: name,
      },
      parentId: {
        equals: parentId,
      },
    },
  });

  if (!exists) return false;
  return true;
};

const filerExists = async (filename, folderId) => {
  const exists = await prisma.file.findFirst({
    where: {
      filename: {
        equals: filename,
      },
      folderId: {
        equals: folderId,
      },
    },
  });

  if (!exists) return false;
  return true;
};

const renameFolder = async (name, id) => {
  const folder = await prisma.folder.update({
    where: {
      id: +id,
    },
    data: {
      name,
    },
  });
  console.log("Folder edit successful");
};

const deleteFolder = async (id) => {
  const deleteFolder = await prisma.folder.delete({
    where: {
      id,
    },
  });
  console.log("Folder deleted");
  return deleteFolder;
};

export {
  getUserByEmail,
  addUser,
  saveFile,
  getFile,
  addFolder,
  getDrive,
  getFolder,
  getFolderPath,
  folderExists,
  filerExists,
  renameFile,
  renameFolder,
  deleteFolder,
  deleteFile,
};
