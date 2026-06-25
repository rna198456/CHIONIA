import { MODEL_CANDIDATES } from "./modelCandidates.js";

export { MODEL_CANDIDATES };

export class LocalModel {
  constructor() {
    this.worker = null;
    this.pending = new Map();
    this.nextRequestId = 1;
    this.loadingPromise = null;
    this.model = null;
    this.ready = false;
  }

  get isReady() {
    return this.ready;
  }

  ensureWorker() {
    if (this.worker) return;

    this.worker = new Worker(new URL("./localModel.worker.js", import.meta.url), {
      type: "module",
    });

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

  rejectAll(error) {
    for (const request of this.pending.values()) {
      request.reject(error);
    }
    this.pending.clear();
    this.loadingPromise = null;
  }

  handleWorkerMessage({ id, type, payload }) {
    const request = this.pending.get(id);
    if (!request) return;

    if (type === "progress") {
      request.onProgress?.(payload);
      return;
    }

    if (type === "loaded") {
      this.model = payload.model;
      this.ready = true;
      if (request.type === "load") {
        this.pending.delete(id);
        request.resolve(this);
      }
      return;
    }

    if (type === "generated") {
      this.pending.delete(id);
      request.resolve(payload.text);
      return;
    }

    if (type === "error") {
      this.pending.delete(id);
      request.reject(new Error(payload.message));
    }
  }

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
          model: this.model,
          file: "Modelo listo",
        });
        return this;
      })
      .finally(() => {
        this.loadingPromise = null;
      });

    return this.loadingPromise;
  }

  async generate({ question, closedAnswer }) {
    if (!this.ready) return closedAnswer;

    return this.request("generate", { question, closedAnswer });
  }
}
