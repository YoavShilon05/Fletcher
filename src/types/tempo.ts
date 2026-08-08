/** A breakpoint on the Live set's tempo envelope. */
export interface TempoChangeEvent {
  /** Beat on the arrangement timeline. */
  time: number;
  /** BPM — quarter notes per minute. */
  tempo: number;
}
