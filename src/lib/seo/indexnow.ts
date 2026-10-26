/**
 * IndexNow Protocol Client for Vidnoria.
 * Instantly pings Bing, Yandex, Seznam and search engine partners
 * whenever pages are created, modified or updated.
 */

export const INDEXNOW_KEY = 'e4b09fa3e7a04918a9134a6efc258d4a';
export const INDEXNOW_HOST = 'vidnoria.com';
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

export interface IndexNowResponse {
  success: boolean;
  statusCode: number;
  message: string;
}

/**
 * Submits a batch of URLs to the IndexNow API.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResponse> {
  const cleanUrls = urls.map((u) => (u.startsWith('http') ? u : `https://${INDEXNOW_HOST}${u.startsWith('/') ? u : `/${u}`}`));

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: cleanUrls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 200 || res.status === 202) {
      return {
        success: true,
        statusCode: res.status,
        message: `${cleanUrls.length} URLs successfully submitted to IndexNow.`,
      };
    }

    return {
      success: false,
      statusCode: res.status,
      message: `IndexNow responded with status ${res.status}.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      statusCode: 500,
      message: err instanceof Error ? err.message : 'Unknown IndexNow submission error.',
    };
  }
}
