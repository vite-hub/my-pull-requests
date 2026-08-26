import { defineHandler } from 'h3'

import { contributions } from '../sources/contributions'

export default defineHandler(() => contributions.get(['github', 'recent']))
