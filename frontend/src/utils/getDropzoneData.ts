export interface DropzoneData {
  key: string;
  preview?: string;
  name?: string;
  size?: number;
  path?: string;
  type?: string;
  lastModified?: number;
  lastModifiedDate?: Date;
}

export default function getDropzoneData(file: any, index?: number): DropzoneData {
  if (typeof file === 'string') {
    return {
      key: index !== undefined ? `${file}-${index}` : file,
      preview: file
    };
  }

  return {
    key: index !== undefined ? `${file.name}-${index}` : file.name,
    name: file.name,
    size: file.size,
    path: file.path,
    type: file.type,
    preview: file.preview,
    lastModified: file.lastModified,
    lastModifiedDate: file.lastModifiedDate
  };
}
