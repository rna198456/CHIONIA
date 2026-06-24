import { env, pipeline } from "@huggingface/transformers";
import { GENERATION_CONFIG, buildChionPrompt } from "../prompts/chionPrompt.js";

env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

export const MODEL_CANDIDATES = [
  {
    id: "HuggingFaceTB/SmolLM2-360M-Instruct",
    dtype: "q4",
    label: "SmolLM2 360M Instruct",
    size: "~250 MB",
  },
  {
    id: "Qwen/Qwen2.5-0.5B-Instruct",
    dtype: "q4",
    label: "Qwen2.5 0.5B Instruct",
    size: "~400 MB",
  },
];

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

export class LocalModel {
  constructor() {
    this.pipe = null;
    this.model = null;
  }

  get isReady() {
    return Boolean(this.pipe);
  }

  async load(onProgress = () => {}) {
    if (this.pipe) return this;

    const errors = [];

    for (const candidate of MODEL_CANDIDATES) {
      try {
        onProgress({
          status: "loading",
          progress: 0,
          model: candidate,
          file: "",
        });

        this.pipe = await pipeline("text-generation", candidate.id, {
          device: "wasm",
          dtype: candidate.dtype,
          progress_callback: (info) => {
            if (info.status === "progress" && info.progress != null) {
              onProgress({
                status: "loading",
                progress: Math.min(99, Math.round(info.progress)),
                model: candidate,
                file: info.file?.split("/").pop() ?? "",
              });
            }

            if (info.status === "done") {
              onProgress({
                status: "loading",
                progress: 100,
                model: candidate,
                file: "Listo",
              });
            }
          },
        });

        this.model = candidate;
        onProgress({
          status: "ready",
          progress: 100,
          model: candidate,
          file: "Modelo listo",
        });
        return this;
      } catch (error) {
        errors.push(`${candidate.label}: ${error.message || String(error)}`);
        this.pipe = null;
        this.model = null;
      }
    }

    throw new Error(errors.join("\n"));
  }

  async generate({ question, closedAnswer }) {
    if (!this.pipe) return closedAnswer;

    const prompt = buildChionPrompt({ question, closedAnswer });
    const output = await this.pipe(prompt, {
      ...GENERATION_CONFIG,
      return_full_text: false,
    });

    return readGeneratedText(output).trim() || closedAnswer;
  }
}
