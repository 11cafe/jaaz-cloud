import { coreSchemas, TransactionType } from "./schema/index";
import { gallerySchemas } from "./schema/image";

export const schemas = {
  ...coreSchemas,
  ...gallerySchemas,
};

export { TransactionType };
