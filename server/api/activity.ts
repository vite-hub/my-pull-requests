import { defineHandler } from 'h3'

import { contributions } from '../collections/contributions'

export default defineHandler(() => contributions.get(['github', 'recent']))
