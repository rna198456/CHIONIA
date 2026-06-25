import { env, pipeline } from "@huggingface/transformers";
import { MODEL_CANDIDATES } from "./modelCandidates.js";
import { GENERATION_CONFIG, buildChionPrompt } from "../prompts/chionPrompt.js";

env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

let pipe = null;
let activeModel = null;

function post(id, type, payload = {}) {
  self.postMessage({ id, type, payload });
}

function serializeError(error) {
  return {
    message: error?.message || String(error),
    stack: error?.stack || "",
  };
}

function readGeneratedText(output) {
  const first = Array.isArray(output) ? output[0] : output;
  const generated = first?.generated_text ?? first?.text ?? first;

  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1];
    return typeof last === "string" ? last : last?.content ?? "";
  }

  if (typeof generated === "object" && generated !== null) {
    return generated.content ?? generated.text ?? "";
  }

  return typeof generated === "string" ? generated : "";
}

async function loadModel(id) {
  if (pipe) {
    post(id, "loaded", { model: activeModel });
    return;
  }

  const errors = [];

  for (const candidate of MODEL_CANDIDATES) {
    try {
      post(id, "progress", {
        status: "loading",
        progress: 0,
        model: candidate,
        file: "",
      });

      pipe = await pipeline("text-generation", candidate.id, {
        device: "wasm",
        dtype: candidate.dtype,
        progress_callback: (info) => {
          if (info.status === "progress" && info.progress != null) {
            post(id, "progress", {
              status: "loading",
              progress: Math.min(99, Math.round(info.progress)),
              model: candidate,
              file: info.file?.split("/").pop() ?? "",
            });
          }

          if (info.status === "done") {
            post(id, "progress", {
              status: "loading",
              progress: 100,
              model: candidate,
              file: "Listo",
            });
          }
        },
      });

      activeModel = candidate;
      post(id, "loaded", { model: candidate });
      return;
    } catch (error) {
      errors.push(`${candidate.label}: ${error.message || String(error)}`);
      pipe = null;
      activeModel = null;
    }
  }

  throw new Error(errors.join("\n"));
}

async function generateAnswer(id, payload) {
  if (!pipe) {
    await loadModel(id);
  }

  const prompt = buildChionPrompt(payload);
  const output = await pipe(prompt, {
    ...GENERATION_CONFIG,
    return_full_text: false,
