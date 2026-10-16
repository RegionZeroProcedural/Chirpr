/** Virtual rechirps derived from the social store, not persisted as separate source posts. */
export function getRechirps(originals, reposts = {}, notes = {}, users = []) {
  return Object.entries(reposts).flatMap(([sourceId, uids]) => {
    const source = originals.find(post => String(post.id) === String(sourceId));
    if (!source || !Array.isArray(uids)) return [];
    return uids.map(uid => {
      const author = users.find(user => String(user.uid) === String(source.uid));
      const comment = notes[`${uid}:${sourceId}`] || '';
      return { ...source, id: `rechirp-${uid}-${sourceId}`, originalPostId: sourceId,
        originalAuthorUid: source.uid, uid, rechirpComment: comment,
        text: `${comment ? `${comment}\n\n` : ''}⇄ Rechirped @${author?.username || 'community'}\n${source.text}`,
        topic: 'RECHIRPED', age: 'now', likes: 0, replies: 0, shares: 0 };
    });
  });
}
