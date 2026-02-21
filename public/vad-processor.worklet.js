// AudioWorklet processor — accumulates 4096-sample chunks (matches old ScriptProcessorNode behavior)
const CHUNK_SIZE = 4096;

class VadProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._pending = [];
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._pending.push(channel[i]);
    }

    while (this._pending.length >= CHUNK_SIZE) {
      const chunk = new Float32Array(this._pending.splice(0, CHUNK_SIZE));
      this.port.postMessage({ samples: chunk }, [chunk.buffer]);
    }

    return true;
  }
}

registerProcessor("vad-processor", VadProcessor);
