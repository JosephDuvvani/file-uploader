import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
};

//---------- File Queries ----------

const saveFile = async (fileInfo) => {
  const { filename, filepath, size, mimetype, folderId, ownerId } = fileInfo;

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
};

const getFile = async (id) => {
  const file = await prisma.file.findUnique({
    where: {
      id,
    },
  });
  return file;
};

const fileExists = async (filename, folderId) => {
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

const renameFile = async (filename, id) => {
  await prisma.file.update({
    where: {
      id: id,
    },
    data: {
      filename,
    },
  });
};

const deleteFile = async (id) => {
  const deleteFile = await prisma.file.delete({
    where: {
      id,
    },
  });
  return deleteFile;
};

//---------- Folder Queries ----------

const addFolder = async (name, parentId, ownerId) => {
  await prisma.folder.create({
    data: {
      name,
      parentId,
      ownerId,
    },
  });
};

const getDrive = async (ownerId) => {
  const drive = await prisma.folder.findFirst({
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
};

const getFolder = async (id, ownerId) => {
  const folder = await prisma.folder.findFirst({
    where: {
      AND: {
        id: {
          equals: id,
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
};

const getFolderPath = async (id) => {
  if (!id) return "";
  const folder = await prisma.folder.findUnique({
    where: {
      id,
    },
    select: {
      parentId: true,
      name: true,
    },
  });

  const name = folder.name;
  if (!folder.parentId) return name;
  const folderPath = (await getFolderPath(folder.parentId)) + "/" + name;
  return folderPath;
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

const renameFolder = async (name, id) => {
  await prisma.folder.update({
    where: {
      id: id,
    },
    data: {
      name,
    },
  });
};

const deleteFolder = async (id) => {
  const deleteFolder = await prisma.folder.delete({
    where: {
      id,
    },
  });
  return deleteFolder;
};

const shareFolder = async (folderId, expiresAt) => {
  const exists = await prisma.shareFolder.findFirst({
    where: {
      folderId,
    },
  });
  if (!exists) {
    await prisma.shareFolder.create({
      data: {
        folderId,
        expiresAt,
      },
    });
  } else {
    await prisma.shareFolder.update({
      where: {
        id: exists.id,
      },
      data: {
        folderId,
        expiresAt,
      },
    });
  }

  const folder = await prisma.folder.findUnique({
    where: {
      id: folderId,
    },
    include: {
      children: true,
    },
  });

  const childFolders = folder.children;

  for (let child of childFolders) {
    await shareFolder(child.id, expiresAt);
  }
};

const getShareDataByFolderId = async (id) => {
  const data = await prisma.shareFolder.findFirst({
    where: {
      folderId: id,
    },
    include: {
      folder: {
        include: {
          children: true,
          files: true,
        },
      },
    },
  });
  return data;
};

const deleteExpiredSharedFolders = async () => {
  const now = new Date();
  try {
    const result = await prisma.shareFolder.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    console.log(`Deleted ${result.count} expired folder shares.`);
  } catch (error) {
    console.error("Error deleting expired rows:", error);
  }
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
  fileExists,
  renameFile,
  renameFolder,
  deleteFolder,
  deleteFile,
  shareFolder,
  getShareDataByFolderId,
  deleteExpiredSharedFolders,
};
