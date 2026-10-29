/** True once "pay ransom" was pressed: the pane shows the lesson. */
export type Paid = boolean

declare module 'claude-code' {
  interface PluginState {
    'security-advisor': {
      /** The terminal animation's frame counter. */
      frame: number
      paid: Paid
    }
  }
}
