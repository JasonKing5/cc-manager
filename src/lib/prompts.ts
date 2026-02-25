import { select } from "@inquirer/prompts";
import chalk from "chalk";

/**
 * Styled confirm prompt using select for better visual feedback.
 * Shows Yes/No with color highlights and arrow-key navigation.
 */
export async function styledConfirm(
  message: string,
  defaultYes = true,
): Promise<boolean> {
  return select({
    message: `${message} ${chalk.dim("(↑↓ to switch, Enter to confirm)")}`,
    choices: [
      { name: chalk.green.bold("Yes"), value: true },
      { name: chalk.red.bold("No"), value: false },
    ],
    default: defaultYes,
  });
}
