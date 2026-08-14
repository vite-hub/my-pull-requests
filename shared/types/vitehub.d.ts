declare module '#vitehub/env/server' {
  import type { SecretEnv } from 'vite-hub/env/secret'

  export interface ServerEnv {
    githubToken: SecretEnv<string>
    recap: {
      from: string
      siteUrl: string
      to: string
    }
  }

  export function useServerEnv(event?: unknown): ServerEnv
}
