import { activeMention, parsePostTokens } from '../data/postText.js';
import { loadLocalChirps, makeLocalChirp, saveLocalChirps } from '../data/localChirps.js';
import { validateMedia } from '../data/mediaVault.js';
import { loadGroups, makeGroup, saveGroups } from '../data/localGroups.js';

describe('Chirpr creator library', () => {
  beforeEach(() => localStorage.clear());

  test('hashtags and mentions are case insensitive, de-duplicated, and separate', () => {
    expect(parsePostTokens('Hello @James! #Chirpr #chirpr @JAMES #music')).toEqual({
      hashtags: ['chirpr','music'], mentions: ['james']
    });
  });

  test('mention suggestions reset as the current word changes', () => {
    expect(activeMention('hello @ja', 9)).toMatchObject({ query:'ja', start:6, end:9 });
    expect(activeMention('hello @ja,', 10)).toBeNull();
    expect(activeMention('hi @mit', 7)).toMatchObject({query:'mit'});
  });

  test('video reels require deliberate opt-in', () => {
    const video = {id:'video-1',kind:'video',moderation:{status:'pending_review',reasons:['Video review required']}};
    expect(makeLocalChirp(1, 'Watch this #fun', {attachment:video}).reelsOptIn).toBe(false);
    const post = makeLocalChirp(1, 'Watch this #fun', {attachment:video,reelsOptIn:true});
    expect(post.reelsOptIn).toBe(true);
    expect(post.moderationStatus).toBe('pending_review');
    expect(post.hashtags).toEqual(['fun']);
    expect(makeLocalChirp(1, '', {attachment:{id:'image-1',kind:'image'},reelsOptIn:true}).reelsOptIn).toBe(false);
  });

  test('media posts have serializable metadata, while actual blobs stay out of localStorage', () => {
    const post = makeLocalChirp(1, '', {attachment:{id:'idb-1',kind:'image',mime:'image/png',name:'test.png',moderation:{status:'pending_review'}}});
    saveLocalChirps([post]);
    const stored = loadLocalChirps();
    expect(stored).toHaveLength(1);
    expect(stored[0].attachment.id).toBe('idb-1');
    expect(localStorage.getItem('chirpr-demo-local-chirps-v1')).not.toContain('data:image/png;base64');
  });

  test('media types and sizes are restricted', () => {
    expect(validateMedia({ type:'image/png',size:100 })).toBe('image');
    expect(validateMedia({ type:'video/mp4',size:1024 })).toBe('video');
    expect(() => validateMedia({type:'text/html',size:1024})).toThrow();
    expect(() => validateMedia({type:'video/mp4',size:42 * 1024 * 1024})).toThrow();
  });

  test('groups can be created with membership metadata and persisted', () => {
    expect(loadGroups().length).toBeGreaterThan(0);
    const group = makeGroup(' Studio ', 'Developers', 1);
    expect(group.memberUids).toEqual([1]);
    saveGroups([group]);
    expect(loadGroups()[0].name).toBe('Studio');
  });
});
