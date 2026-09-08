import { MultipartFile } from '@fastify/multipart';

export type ProfileIdParams = {
  id: string;
};

export type ProfileMediaFilenameParams = {
  filename: string;
};

export type UploadProfilePhotoBody = {
  photo?: MultipartFile;
};

export type UploadProfileVideoBody = {
  video?: MultipartFile;
};

export type SyncUserLocationBody = {
  latitude: number;
  longitude: number;
};
