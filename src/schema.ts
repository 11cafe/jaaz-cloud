import { coreSchemas } from "./schema/index";
import { gallerySchemas } from "./schema/image";

export const schemas = {
  ...coreSchemas,
  ...gallerySchemas,
};
