import { defineEventHandler } from 'h3'

export default defineEventHandler(event => readGitHubActivity(event))
