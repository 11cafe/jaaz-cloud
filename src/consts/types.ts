export type PromptParams = {
  prompt: string;
  [key: string]: any;
};

export type ModelInput = {
  prompt?: string;
  [key: string]: any;
};

export type ModelDep = {
  folder: string | null;
  hash: string | null;
  url: string | null;
  keepName?: boolean;
  // optional info only for passing Modefile.civitai link to click on
  infoUrl?: string | null;
  // TODO: will be deperecated
  name?: string;
  filename?: string;
  fileFolder?: string | null;
  fileHash?: string | null;
  downloadUrl?: string | null;
  // optional
  nodeType?: string;
  inputName?: string;
};

export type ImageDep = {
  url?: string | null;
  // deprecate
  filename?: string;
  nodeType?: string;
};
type NodeRepo = {
  commitHash: string;
  gitRepo: string;
};

export type DepsResult = {
  models?: Record<string, ModelDep | null>;
  images?: Record<string, ImageDep | null>;
  nodeRepos?: NodeRepo[]; //to be deprecate and removed
  machine?: {
    id: string;
    snapshot: MachineSnapshot;
    rp_endpoint: string;
  };
};

export type MachineSnapshot = {
  comfyui?: string | null;
  git_custom_nodes: Record<
    string,
    {
      hash?: string | null;
    }
  >;
  pip_install?: string[];
  models?: Record<
    string,
    {
      url: string;
    }
  >;
  model_deps?: Record<string, ModelDep>;
};
export enum EAppRoute {
  root = "root",
  gallery = "gallery",
}

export type RunpodRegion =
  | "US-OR-1"
  | "CA-MTL-1"
  | "EU-RO-1"
  | "US-KS-2"
  | "EU-SE-1";

export const comfyModelFolderNames = [
  "checkpoints",
  "loras",
  "vae",
  "controlnet",
  "animatediff_models",
  "animatediff_motion_lora",
  "clip_vision",
  "clip",
  "diffusers",
  "embeddings",
  "gligen",
  "hypernetworks",
  "ipadapter",
  "mmdets/bbox",
  "onnx",
  "photomaker",
  "sams",
  "style_models",
  "ultralytics/bbox",
  "ultralytics/segm",
  "unet",
  "upscale_models",
  "vae_approx",
] as const;

export type ComfyModelFolderName = (typeof comfyModelFolderNames)[number];

export function isComfyModelFolderName(
  name: string,
): name is ComfyModelFolderName {
  return comfyModelFolderNames.includes(name as ComfyModelFolderName);
}

export enum ERechargePaymentState {
  SUCCESS = "success",
  CANCEL = "cancel",
}

export type RunpodJobStatus = {
  id?: string;
  delayTime: number;
  executionTime: number;
  status: "FAILED" | "IN_QUEUE" | "COMPLETED";
  error?: string;
};

export type RunJobInput = {
  prompt?: Record<string, any>;
  deps?: DepsResult;
  comfyui?: boolean;
};
