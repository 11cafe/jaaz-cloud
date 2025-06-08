import { DepsResult } from "@/consts/types";
import {
  WORKFLOW_WORKSPACE_INFO_FIELD,
  imageFileExtensions,
  modelFileExtensions,
} from "./consts";
import { ImagePrompt } from "@/components/prompt-form/MetaBox/utils";
import { WorkflowVersion } from "@/server/dbTypes";

export function getOriginalDepsAndApiFromVersion(
  version: WorkflowVersion,
): [DepsResult | null, ImagePrompt | null] {
  const json = version.json;
  const workflowJson = JSON.parse(json);
  let prompt =
    workflowJson.extra?.apiPrompt ??
    workflowJson.extra?.[WORKFLOW_WORKSPACE_INFO_FIELD]?.apiPrompt ??
    null;
  if (!prompt) {
    try {
      prompt = version.api_prompt ? JSON.parse(version.api_prompt) : null;
    } catch (e) {
      console.error("Failed to parse api_prompt", e);
    }
  }
  const deps: DepsResult | null = getDepsFromGraphObj(workflowJson);

  return [deps, prompt];
}

export function getDepsFromGraphObj(graphObj: any): DepsResult | null {
  const deps: DepsResult | null =
    graphObj.extra?.deps ??
    graphObj.extra?.[WORKFLOW_WORKSPACE_INFO_FIELD]?.deps ??
    null;
  return deps;
}

export function getAllDepsFromVersionWithMissing(
  version: WorkflowVersion,
): [DepsResult, ImagePrompt | null] {
  const deps: DepsResult = {
    models: {},
    images: {},
    nodeRepos: [],
  };

  const [returnedDeps, prompt] = getOriginalDepsAndApiFromVersion(version);
  const existingDeps = returnedDeps ?? {};
  const promptNodes = Object.values(prompt ?? {}) as any;
  promptNodes.forEach(
    (node: { class_type: string; inputs?: Record<string, any> }) => {
      if (node.inputs) {
        Object.keys(node.inputs).forEach((inputName) => {
          const value = node.inputs?.[inputName];
          if (typeof value != "string") return;
          // Check if it's a model file
          if (modelFileExtensions.some((ext) => value.endsWith(ext))) {
            if (!deps.models) {
              deps.models = {};
            }
            deps.models[value] = {
              folder: null,
              hash: null,
              url: null,
            };
          }
          // Check if it's an image file
          if (imageFileExtensions.some((ext) => value.endsWith(ext))) {
            deps.images![value] = existingDeps.images?.[value] ?? {
              url: null,
            };
          }
        });
      }
    },
  );

  const newDeps = {
    models: {
      ...deps.models,
      ...existingDeps.models,
    },
    images: {
      ...deps.images,
    },
    nodeRepos: existingDeps.nodeRepos ?? [],
  };

  return [newDeps, prompt];
}

export function getApiPromptFromWorkflowJson(
  json: string,
): Record<string, any> | null {
  const workflowJson = JSON.parse(json);
  return workflowJson.extra?.[WORKFLOW_WORKSPACE_INFO_FIELD]
    ?.apiPrompt as Record<string, any> | null;
}

export function encodeUserLikedWorkflowID(userID: string, workflowID: string) {
  return userID + "::" + workflowID;
}
