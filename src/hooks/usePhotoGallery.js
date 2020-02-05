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
      const photos = photoString ? JSON.parse(photoString) : [];

      // If running on the web
      if (!isPlatform("hybrid")) {
        for (let photo of photos) {
          const file = await readFile({
            path: photo.filepath,
            directory: FilesystemDirectory.Data
          });
          photo.base64 = `data:image/jpeg;base64,${file.data}`;
        }
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
    const savedFileImage = await savePicture(cameraPhoto, fileName);
    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);

    set(
      PHOTO_STORAGE,
      isPlatform("hybrid")
        ? JSON.stringify(newPhotos)
        : JSON.stringify(
            newPhotos.map(p => {
              // Don't save the base64 representation of the photo data,
              // since it's already saved on the Filesystem
              const { data, ...strippedPhoto } = p;
              return strippedPhoto;
            })
          )
    );
  };

  const savePicture = async (photo, fileName) => {
    let base64Data;

    // "hybrid" wil detect Cordova or Capactiro
    if (isPlatform("hybrid")) {
      const file = await readFile({
        path: photo.path
      });
      base64Data = file.data
    } else {
      base64Data = await base64FromPath(photo.webPath);
    }

    await writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data
    });

    const photoFile = await getPhotoFile(photo, fileName);
    return photoFile;
  };

  const getPhotoFile = async (cameraPhoto, fileName) => {
    if (isPlatform("hybrid")) {
      // Get the new, complete filepath of the photo saved on filesystem
      const fileUri = await getUri({
        directory: FilesystemDirectory.Data,
        path: fileName
      });

      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: fileUri.uri,
        webviewPath: Capacitor.convertFileSrc(fileUri.uri),
      };

    } else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: cameraPhoto.webPath
      };
    }
  };

  return {
    photos,
    takePhoto
  };
};
