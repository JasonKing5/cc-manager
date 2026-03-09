import chalk from "chalk";
import type { Command } from "commander";

export function registerCompletionCommand(program: Command): void {
  program
    .command("completion [shell]")
    .description("Generate shell completion script (bash, zsh, fish)")
    .action(completionCommand);
}

const BASH_COMPLETION = `# ccm bash completion
_ccm_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"

  local commands="add list ls use edit remove rm model usage status doctor clone cp export import snapshot completion help"

  case "\${prev}" in
    ccm)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    use|edit|remove|rm|clone|cp|export)
      local configs=$(ccm status --json 2>/dev/null | grep -o '"active":"[^"]*"' | cut -d'"' -f4)
      if command -v jq &>/dev/null; then
        configs=$(ccm list --json 2>/dev/null | jq -r 'keys[]' 2>/dev/null)
      fi
      COMPREPLY=( $(compgen -W "\${configs}" -- "\${cur}") )
      return 0
      ;;
    import)
      COMPREPLY=( $(compgen -f -X '!*.json' -- "\${cur}") )
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
}
complete -F _ccm_completions ccm
`;

const ZSH_COMPLETION = `#compdef ccm
# ccm zsh completion

_ccm() {
  local -a commands
  commands=(
    'add:Add a new provider configuration'
    'list:List all configurations'
    'ls:List all configurations'
    'use:Switch active configuration'
    'edit:Edit a configuration'
    'remove:Remove a configuration'
    'rm:Remove a configuration'
    'model:Select a model from active configuration'
    'usage:Query current API key balance and quota'
    'status:Show current active configuration'
    'doctor:Diagnose configuration issues'
    'clone:Clone a configuration'
    'cp:Clone a configuration'
    'export:Export configurations to a JSON file'
    'import:Import configurations from a JSON file'
    'snapshot:Save current settings as a new configuration'
    'completion:Generate shell completion script'
    'help:Display help for command'
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case \$state in
    command)
      _describe -t commands 'ccm command' commands
      ;;
    args)
      case \$words[1] in
        use)
          _arguments \\
            '-p[Switch to previous configuration]' \\
            '--previous[Switch to previous configuration]' \\
            '-l[Launch claude after switching]' \\
            '--launch[Launch claude after switching]'
          ;;
        status)
          _arguments \\
            '--json[Output as JSON]' \\
            '--short[One-line output]'
          ;;
        doctor)
          _arguments \\
            '--test-api[Test API connectivity]'
          ;;
        export)
          _arguments \\
            '-o[Output file path]:file:_files' \\
            '--output[Output file path]:file:_files' \\
            '--mask-secrets[Mask secret values]'
          ;;
        import)
          _arguments '1:file:_files -g "*.json"'
          ;;
      esac
      ;;
  esac
}

_ccm
`;

const FISH_COMPLETION = `# ccm fish completion

# Disable file completions by default
complete -c ccm -f

# Commands
complete -c ccm -n '__fish_use_subcommand' -a add -d 'Add a new provider configuration'
complete -c ccm -n '__fish_use_subcommand' -a list -d 'List all configurations'
complete -c ccm -n '__fish_use_subcommand' -a use -d 'Switch active configuration'
complete -c ccm -n '__fish_use_subcommand' -a edit -d 'Edit a configuration'
complete -c ccm -n '__fish_use_subcommand' -a remove -d 'Remove a configuration'
complete -c ccm -n '__fish_use_subcommand' -a model -d 'Select a model from active configuration'
complete -c ccm -n '__fish_use_subcommand' -a usage -d 'Query current API key balance and quota'
complete -c ccm -n '__fish_use_subcommand' -a status -d 'Show current active configuration'
complete -c ccm -n '__fish_use_subcommand' -a doctor -d 'Diagnose configuration issues'
complete -c ccm -n '__fish_use_subcommand' -a clone -d 'Clone a configuration'
complete -c ccm -n '__fish_use_subcommand' -a export -d 'Export configurations'
complete -c ccm -n '__fish_use_subcommand' -a import -d 'Import configurations'
complete -c ccm -n '__fish_use_subcommand' -a snapshot -d 'Save current settings as configuration'
complete -c ccm -n '__fish_use_subcommand' -a completion -d 'Generate shell completion script'

# use options
complete -c ccm -n '__fish_seen_subcommand_from use' -s p -l previous -d 'Switch to previous configuration'
complete -c ccm -n '__fish_seen_subcommand_from use' -s l -l launch -d 'Launch claude after switching'

# status options
complete -c ccm -n '__fish_seen_subcommand_from status' -l json -d 'Output as JSON'
complete -c ccm -n '__fish_seen_subcommand_from status' -l short -d 'One-line output'

# doctor options
complete -c ccm -n '__fish_seen_subcommand_from doctor' -l test-api -d 'Test API connectivity'

# export options
complete -c ccm -n '__fish_seen_subcommand_from export' -s o -l output -d 'Output file path' -r
complete -c ccm -n '__fish_seen_subcommand_from export' -l mask-secrets -d 'Mask secret values'

# import - accept json files
complete -c ccm -n '__fish_seen_subcommand_from import' -F
`;

async function completionCommand(shell?: string): Promise<void> {
  const target = shell ?? detectShell();

  switch (target) {
    case "bash":
      console.log(BASH_COMPLETION);
      console.error(
        chalk.dim('# Add to ~/.bashrc: eval "$(ccm completion bash)"'),
      );
      break;
    case "zsh":
      console.log(ZSH_COMPLETION);
      console.error(
        chalk.dim('# Add to ~/.zshrc: eval "$(ccm completion zsh)"'),
      );
      break;
    case "fish":
      console.log(FISH_COMPLETION);
      console.error(
        chalk.dim(
          "# Save to: ~/.config/fish/completions/ccm.fish",
        ),
      );
      break;
    default:
      console.log(
        chalk.yellow(
          `Unknown shell "${target}". Supported: bash, zsh, fish`,
        ),
      );
      process.exit(1);
  }
}

function detectShell(): string {
  const shell = process.env.SHELL ?? "";
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("fish")) return "fish";
  return "bash";
}
