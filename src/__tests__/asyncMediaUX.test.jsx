import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import MediaUploadModal from '../components/MediaUploadModal.jsx';
import { dismissMediaUpload, enqueueMediaUpload, getMediaUploads } from '../data/mediaUploadQueue.js';
import { getModerationSignal } from '../data/moderationClient.js';
import { removeMedia, storeMedia } from '../data/mediaVault.js';

jest.mock('../data/mediaVault.js', () => ({
  storeMedia: jest.fn(), removeMedia: jest.fn(() => Promise.resolve()),
  validateMedia: jest.fn(file => file.type.startsWith('video/') ? 'video' : 'image')
}));
jest.mock('../data/moderationClient.js', () => ({ getModerationSignal: jest.fn() }));
const media = { id:'photo-test', kind:'image', moderation:{status:'pending_review'} };
function deferred() { let resolve; let reject; const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject}; }

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = jest.fn();
  jest.useFakeTimers();
  getMediaUploads().forEach(upload => dismissMediaUpload(upload.id));
  storeMedia.mockReset();
  getModerationSignal.mockReset();
  removeMedia.mockClear();
});
afterEach(() => { cleanup(); jest.runOnlyPendingTimers(); jest.useRealTimers(); });

test('a queued upload is independent of its modal and publishes after moderation completes', async () => {
  const storage = deferred(), review = deferred();
  storeMedia.mockReturnValue(storage.promise);
  getModerationSignal.mockReturnValue(review.promise);
  const publish = jest.fn(() => ({id:'posted-1'}));
  const file = new File(['a'], 'upload.png',{type:'image/png'});
  const queued = enqueueMediaUpload({ file, caption:'hello', onPublish:publish, isProfile:true, profileUsername:'keegan' });
  expect(getMediaUploads()[0].status).toBe('saving');
  await act(async () => { storage.resolve({...media}); await Promise.resolve(); });
  expect(getMediaUploads()[0].status).toBe('reviewing');
  expect(publish).not.toHaveBeenCalled();
  await act(async () => { review.resolve({status:'pending_review',reasons:['Waiting for review']}); await queued.promise; });
  expect(publish).toHaveBeenCalledWith('hello', expect.objectContaining({reelsOptIn:false,attachment:expect.objectContaining({id:'photo-test',moderation:expect.objectContaining({status:'pending_review'})})}));
  expect(getMediaUploads()[0].status).toBe('complete');
  expect(getMediaUploads()[0].postId).toBe('posted-1');
});

test('send releases the modal without waiting for IndexedDB or moderation', async () => {
  const storage = deferred();
  storeMedia.mockReturnValue(storage.promise); // never resolves during the test
  const onClose = jest.fn();
  const { unmount } = render(<MediaUploadModal origin={{left:12,top:20,width:50,height:30}} onClose={onClose} onPublish={jest.fn()} isProfile profileUsername="keegan" />);
  const file = new File(['a'], 'upload.png',{type:'image/png'});
  fireEvent.change(document.querySelector('.chirpr-upload-drop input'), {target:{files:[file]}});
  fireEvent.click(screen.getByRole('button',{name:/post with media/i}));
  expect(getMediaUploads()[0].status).toBe('saving');
  await act(async () => { jest.advanceTimersByTime(145); });
  expect(onClose).toHaveBeenCalledWith({queued:true});
  unmount();
  expect(getMediaUploads()[0].status).toBe('saving');
});

test('close X destroys modal into uniquely scattered glass fragments and does not queue', async () => {
  const onClose = jest.fn();
  render(<MediaUploadModal origin={{left:100,top:90,width:80,height:40}} onClose={onClose} onPublish={jest.fn()} />);
  fireEvent.click(screen.getByRole('button',{name:/close upload/i}));
  const shards = document.querySelectorAll('.chirpr-upload-shatter__piece');
  expect(shards).toHaveLength(9);
  expect(new Set([...shards].map(shard => shard.style.getPropertyValue('--shatter-x'))).size).toBeGreaterThan(1);
  expect(document.querySelector('.chirpr-upload-overlay--destruct')).not.toBeNull();
  await act(async () => { jest.advanceTimersByTime(750); });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(getMediaUploads()).toHaveLength(0);
});

test('failed media upload stays private and reports error without publishing', async () => {
  storeMedia.mockRejectedValue(new Error('No local storage space'));
  const publish = jest.fn();
  const queued = enqueueMediaUpload({file:new File(['a'],'a.png',{type:'image/png'}),onPublish:publish});
  await act(async () => { await queued.promise; });
  expect(publish).not.toHaveBeenCalled();
  expect(getMediaUploads()[0].status).toBe('error');
  expect(getMediaUploads()[0].message).toContain('No local storage space');
});
