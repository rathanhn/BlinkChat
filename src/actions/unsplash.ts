'use server';

import { createApi } from 'unsplash-js';

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY!,
});

export async function getBanners(query?: string) {
  try {
    const result = query
      ? await unsplash.search.getPhotos({
          query,
          orientation: 'landscape',
          perPage: 9,
        })
      : await unsplash.photos.getRandom({
          count: 9,
          orientation: 'landscape',
          query: 'abstract background',
        });

    if (result.type === 'success') {
      if (Array.isArray(result.response)) {
        return result.response;
      }
      return result.response.results;
    } else {
      console.error('failed to get images from unsplash', result.errors);
      return null;
    }
  } catch (error) {
    console.error('Error fetching from Unsplash:', error);
    return null;
  }
}
