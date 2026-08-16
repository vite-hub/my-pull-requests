import { defineEventHandler } from 'h3'

import { contributions } from '../collections/contributions'

export default defineEventHandler(() => contributions.get(['github', 'recent']))
