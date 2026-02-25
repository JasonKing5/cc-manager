import { select } from "@inquirer/prompts";
import chalk from "chalk";

/**
 * Confirm prompt using select with arrow-key navigation.
 * Focused item: bold, unfocused item: dim gray.
 */
export async function styledConfirm(
  message: string,
  defaultYes = true,
): Promise<boolean> {
  return select({
    message: `${message} ${chalk.dim("(↑↓ to switch, Enter to confirm)")}`,
    choices: [
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
    default: defaultYes,
    theme: {
      style: {
        highlight: (text: string) => chalk.bold(text),
      },
    },
  });
}
