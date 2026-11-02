/** Load sharp without Next/OpenNext tracing it into the Worker bundle. */
export async function loadSharp(): Promise<{ default: SharpFactory } | null> {
  try {
    const name = ["sh", "arp"].join("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await import(name)) as any;
  } catch (err) {
    console.warn("[sharp] unavailable:", err);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharpFactory = (input?: Buffer | Uint8Array | string) => any;
