import { defineEventHandler } from 'h3'

export default defineEventHandler(event => getGitHubActivity(event))
