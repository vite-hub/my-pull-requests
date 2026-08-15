declare module '#vitehub/emails/*' {
  const render: (data?: Record<string, unknown>) => Promise<string>
  export default render
}
