/**
 * Convert audio blob to WAV format
 * @param {Blob} blob - Audio blob in any format
 * @returns {Promise<Blob>} - WAV formatted blob
 */
export async function convertToWav(blob) {
  //Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  //Read blob as array buffer
  const arrayBuffer = await blob.arrayBuffer();

  //Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  //Convert to WAV
  const wavBlob = audioBufferToWav(audioBuffer);

  //Close audio context
  await audioContext.close();

  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV blob
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}
 */
function audioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; //PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = interleave(audioBuffer);
  const dataLength = data.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  //Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); //fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); //byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  //Write audio data
  floatTo16BitPCM(view, 44, data);

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Interleave audio channels
 */
function interleave(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numChannels;
  const result = new Float32Array(length);

  let offset = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      result[offset++] = audioBuffer.getChannelData(channel)[i];
    }
  }

  return result;
}

/**
 * Convert float samples to 16-bit PCM
 */
function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Write string to DataView
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
