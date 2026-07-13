export type PublicRuntimeConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  zentroApiUrl: string;
  siteUrl: string;
};

let configPromise: Promise<PublicRuntimeConfig> | null = null;

export function getPublicConfig() {
  configPromise ??= fetch("/api/public-config", {
    cache: "no-store",
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load public config: HTTP ${response.status}`);
    }

    return (await response.json()) as PublicRuntimeConfig;
  });

  return configPromise;
}

export function resetPublicConfigCacheForTests() {
  configPromise = null;
}
