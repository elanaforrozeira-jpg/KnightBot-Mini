/**
 * Helpers to make outbound audio messages more WhatsApp-compatible.
 */

const detectAudioFormat = (buffer, contentType = '') => {
  const sig4 = buffer.slice(0, 4).toString('hex');
  const head16 = buffer.slice(0, 16).toString('utf8').toLowerCase();
  const ftyp = buffer.slice(4, 8).toString('ascii');
  const normalizedType = String(contentType || '').toLowerCase();

  if (normalizedType.includes('audio/ogg') || sig4 === '4f676753') {
    return { mimetype: 'audio/ogg; codecs=opus', ext: 'ogg' };
  }

  if (normalizedType.includes('audio/mp4') || normalizedType.includes('video/mp4') || ftyp === 'ftyp') {
    return { mimetype: 'audio/mp4', ext: 'm4a' };
  }

  if (normalizedType.includes('audio/wav') || sig4 === '52494646') {
    return { mimetype: 'audio/wav', ext: 'wav' };
  }

  if (
    normalizedType.includes('audio/mpeg') ||
    head16.startsWith('id3') ||
    sig4.startsWith('fffb') ||
    sig4.startsWith('fff3') ||
    sig4.startsWith('ffe3')
  ) {
    return { mimetype: 'audio/mpeg', ext: 'mp3' };
  }

  return { mimetype: 'audio/mpeg', ext: 'mp3' };
};

const looksLikeTextPayload = (buffer, contentType = '') => {
  const normalizedType = String(contentType || '').toLowerCase();
  if (
    normalizedType.includes('text/html') ||
    normalizedType.includes('application/json') ||
    normalizedType.includes('text/plain')
  ) return true;

  const probe = buffer.slice(0, 200).toString('utf8').trim().toLowerCase();
  return probe.startsWith('<!doctype html') ||
    probe.startsWith('<html') ||
    probe.startsWith('{') ||
    probe.startsWith('{"');
};

const cleanAudioTitle = (title = 'song') => {
  const cleaned = String(title).replace(/[^\w\s\-]/g, '').trim();
  return cleaned || 'song';
};

module.exports = {
  detectAudioFormat,
  looksLikeTextPayload,
  cleanAudioTitle
};
