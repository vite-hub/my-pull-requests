import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => (await readGitHubActivity()).contributions)
