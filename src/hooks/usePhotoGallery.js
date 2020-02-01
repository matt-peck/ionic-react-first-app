import { useState, useEffect } from "react";
import { useCamera } from "@ionic/react-hooks/camera";
import { useFilesystem, base64FromPath } from "@ionic/react-hooks/filesystem";
import { useStorage } from "@ionic/react-hooks/storage";
import { isPlatform } from "@ionic/react";
import {
  CameraResultType,
  CameraSource,
  CameraPhoto,
  Capacitor,
  FilesystemDirectory
} from "@capacitor/core";

const PHOTO_STORAGE = "photos";

export const usePhotoGallery = () => {
  const { getPhoto } = useCamera();
  const { deleteFile, getUri, readFile, writeFile } = useFilesystem();
  const { get, set } = useStorage();
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const loadSaved = async () => {
      const photoString = await get("photos");
      console.log(photoString);
      const photos = photoString ? JSON.parse(photoString) : [];
      console.log(photos);

      for (let photo of photos) {
        console.log(photo);

        const file = await readFile({
          path: photo.filepath,
          directory: FilesystemDirectory.Data
        });
        photo.base64 = `data:image/jpeg;base64,${file.data}`;
      }

      setPhotos(photos);
    };
    loadSaved();
  }, [get, readFile]);

  const takePhoto = async () => {
    const cameraPhoto = await getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    const fileName = new Date().getTime() + ".jpeg";
    const savedFileImage = await savePictures(cameraPhoto, fileName);
    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);

    set(
      PHOTO_STORAGE,
      JSON.stringify(
        newPhotos.map(p => {
          // Don't save the base64 representation of the photo data,
          // since it's already saved on the Filesystem
          const { data, ...strippedPhoto } = p;
          return strippedPhoto;
        })
      )
    );
  };

  const savePictures = async (photo, fileName) => {
    const base64Data = await base64FromPath(photo.webPath);
    await writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data
    });
    const photoFile = await getPhotoFile(photo, fileName);
    return photoFile;
  };

  const getPhotoFile = async (cameraPhoto, fileName) => {
    return {
      filepath: fileName,
      webviewPath: cameraPhoto.webPath
    };
  };

  return {
    photos,
    takePhoto
  };
};
