import type { Endpoints } from '@octokit/types'

type UserResponse = Endpoints['GET /user']['response']

export function buildUser(response: UserResponse): User {
  return {
    name: response.data.name ?? response.data.login,
    username: response.data.login,
    avatar: response.data.avatar_url,
  }
}
