<script setup lang="ts">
interface Props {
  avatar: string
  avatarAlt: string
  avatarHref?: string
  description?: string
  title: string
}

defineProps<Props>()

defineSlots<{
  actions?(): unknown
}>()
</script>

<template>
  <header class="contribution-header">
    <div class="contribution-header__intro">
      <a
        href="https://vitehub.dev"
        class="contribution-header__built-with"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 20 18" aria-hidden="true">
          <path d="M19.734 8.156 15.576.844A1.66 1.66 0 0 0 14.135 0H5.819C5.226 0 4.677.32 4.38.844L.222 8.156a1.71 1.71 0 0 0 0 1.688l4.158 7.312c.297.523.846.844 1.439.844h8.316c.593 0 1.142-.32 1.438-.844l4.158-7.312c.3-.523.3-1.165.003-1.688Z" />
        </svg>
        <span>Built with <strong>vitehub.dev</strong></span>
      </a>

      <div class="contribution-header__identity">
        <a
          v-if="avatarHref"
          :href="avatarHref"
          class="contribution-header__avatar"
          target="_blank"
          rel="noopener noreferrer"
        >
          <UAvatar :src="avatar" :alt="avatarAlt" size="2xl" />
        </a>
        <UAvatar
          v-else
          :src="avatar"
          :alt="avatarAlt"
          class="contribution-header__avatar"
          size="2xl"
        />

        <h1 class="contribution-header__title">
          {{ title }}
        </h1>
      </div>

      <p v-if="description" class="contribution-header__description">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="contribution-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.contribution-header {
  align-items: center;
  background: radial-gradient(circle at 1px 1px, var(--app-pattern) 1px, transparent 0) 0 0 / 18px 18px, var(--ui-bg-muted);
  border-radius: .875rem;
  display: flex;
  gap: 2rem;
  justify-content: space-between;
  padding: clamp(1rem, 2vw, 1.5rem);
}

.contribution-header__intro {
  min-width: 0;
}

.contribution-header__identity {
  align-items: center;
  display: flex;
  gap: .75rem;
}

.contribution-header__avatar {
  display: inline-flex;
  flex: none;
}

.contribution-header__built-with {
  align-items: center;
  color: var(--ui-text-muted);
  display: inline-flex;
  font-size: .75rem;
  gap: .375rem;
  margin-bottom: .875rem;
  text-decoration: none;
}

.contribution-header__built-with svg {
  fill: currentColor;
  height: .75rem;
  width: .875rem;
}

.contribution-header__built-with strong {
  color: var(--ui-text-highlighted);
  font-weight: 600;
}

.contribution-header__built-with:hover strong {
  text-decoration: underline;
}

.contribution-header__title {
  color: var(--ui-text-highlighted);
  font-size: clamp(2.75rem, 6vw, 5rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
}

.contribution-header__description {
  color: var(--ui-text-muted);
  margin-top: .875rem;
}

.contribution-header__actions {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .contribution-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .contribution-header__actions {
    align-items: center;
    flex-direction: row;
    flex-wrap: wrap;
    white-space: normal;
  }
}
</style>
