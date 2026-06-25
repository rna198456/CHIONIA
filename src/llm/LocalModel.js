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
import { MODEL_CANDIDATES } from "./modelCandidates.js";

function readGeneratedText(output) {
  const first = Array.isArray(output) ? output[0] : output;
  const generated = first?.generated_text ?? first?.text ?? first;
export { MODEL_CANDIDATES };

  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1];
    return typeof last === "string" ? last : last?.content ?? "";
export class LocalModel {
  constructor() {
    this.worker = null;
    this.pending = new Map();
    this.nextRequestId = 1;
    this.loadingPromise = null;
    this.model = null;
    this.ready = false;
  }

  if (typeof generated === "object" && generated !== null) {
    return generated.content ?? generated.text ?? "";
  get isReady() {
    return this.ready;
  }

  return typeof generated === "string" ? generated : "";
}
  ensureWorker() {
    if (this.worker) return;

    this.worker = new Worker(new URL("./localModel.worker.js", import.meta.url), {
      type: "module",
    });

export class LocalModel {
  constructor() {
    this.pipe = null;
    this.model = null;
    this.worker.onmessage = (event) => this.handleWorkerMessage(event.data);
    this.worker.onerror = (event) => {
      this.rejectAll(
        new Error(event.message || "El worker del modelo local se detuvo.")
      );
      this.worker = null;
      this.ready = false;
      this.model = null;
    };
  }

  get isReady() {
    return Boolean(this.pipe);
  rejectAll(error) {
    for (const request of this.pending.values()) {
      request.reject(error);
    }
    this.pending.clear();
    this.loadingPromise = null;
  }

  async load(onProgress = () => {}) {
    if (this.pipe) return this;
  handleWorkerMessage({ id, type, payload }) {
    const request = this.pending.get(id);
    if (!request) return;

    const errors = [];
    if (type === "progress") {
      request.onProgress?.(payload);
      return;
    }

    for (const candidate of MODEL_CANDIDATES) {
      try {
        onProgress({
          status: "loading",
          progress: 0,
          model: candidate,
          file: "",
        });
    if (type === "loaded") {
      this.model = payload.model;
      this.ready = true;
      if (request.type === "load") {
        this.pending.delete(id);
        request.resolve(this);
      }
      return;
    }

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
    if (type === "generated") {
      this.pending.delete(id);
      request.resolve(payload.text);
      return;
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
    if (type === "error") {
      this.pending.delete(id);
      request.reject(new Error(payload.message));
    }
  }

        this.model = candidate;
  request(type, payload = {}, onProgress) {
    this.ensureWorker();

    const id = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress, type });
      this.worker.postMessage({ id, type, payload });
    });
  }

  async load(onProgress = () => {}) {
    if (this.ready) return this;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.request("load", {}, onProgress)
      .then(() => {
        onProgress({
          status: "ready",
          progress: 100,
          model: candidate,
          model: this.model,
          file: "Modelo listo",
        });
        return this;
      } catch (error) {
        errors.push(`${candidate.label}: ${error.message || String(error)}`);
        this.pipe = null;
        this.model = null;
      }
    }
      })
      .finally(() => {
        this.loadingPromise = null;
      });

    throw new Error(errors.join("\n"));
    return this.loadingPromise;
  }

  async generate({ question, closedAnswer }) {
    if (!this.pipe) return closedAnswer;
    if (!this.ready) return closedAnswer;

    const prompt = buildChionPrompt({ question, closedAnswer });
    const output = await this.pipe(prompt, {
      ...GENERATION_CONFIG,
      return_full_text: false,
    });

    return readGeneratedText(output).trim() || closedAnswer;
    return this.request("generate", { question, closedAnswer });
  }
}
