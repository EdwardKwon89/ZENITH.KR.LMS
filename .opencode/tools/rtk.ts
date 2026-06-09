import { tool } from "@opencode-ai/plugin"

interface ExecOpts {
  encoding: "utf-8"
  timeout: number
  maxBuffer: number
  shell: boolean
  cwd?: string
}

async function exec(cmd: string, opts: ExecOpts): Promise<string> {
  const { execSync } = await import("child_process")
  return execSync(cmd, opts as any).toString()
}

async function rtkRewrite(cmd: string, opts: ExecOpts): Promise<string | null> {
  try {
    const result = await exec(`rtk rewrite ${JSON.stringify(cmd)} 2>/dev/null || echo "__NOREWRITE__"`, opts)
    const trimmed = result.trim()
    return trimmed === "__NOREWRITE__" || trimmed === cmd ? null : trimmed
  } catch {
    return null
  }
}

export default tool({
  description:
    "Execute shell commands with RTK token optimization. Use this instead of 'bash' for: git, docker, gh, kubectl, npm, pnpm, ls, tree, find, grep, diff, wc, wget, aws, psql, read, dotnet commands.",
  args: {
    command: tool.schema.string().describe("Shell command to execute"),
    description: tool.schema.string().optional().describe("Description of the command"),
    timeout: tool.schema.number().optional().describe("Timeout in milliseconds"),
    workdir: tool.schema.string().optional().describe("Working directory"),
  },
  async execute(args) {
    const opts: ExecOpts = {
      encoding: "utf-8",
      timeout: args.timeout ?? 120_000,
      maxBuffer: 50 * 1024 * 1024,
      shell: true,
    }
    if (args.workdir) opts.cwd = args.workdir

    const rewritten = await rtkRewrite(args.command, opts)
    const finalCmd = rewritten ?? args.command

    try {
      return await exec(finalCmd, opts)
    } catch (e: any) {
      const stderr = e.stderr?.toString() ?? ""
      const stdout = e.stdout?.toString() ?? ""
      return `exit code ${e.status ?? "?"}\n${stdout}${stderr ? "\n" + stderr : ""}`
    }
  },
})
