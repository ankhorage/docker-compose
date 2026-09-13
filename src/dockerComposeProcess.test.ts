import { expect, it } from 'bun:test';

import { createSubprocessDockerComposeCommandRunner } from './index';

it('executes argv, stdin and execution-only environment values without a shell', async () => {
  const runner = createSubprocessDockerComposeCommandRunner();
  const result = await runner.runAsync({
    executable: process.execPath,
    arguments: [
      '-e',
      "let input = ''; process.stdin.on('data', chunk => input += chunk); process.stdin.on('end', () => process.stdout.write(JSON.stringify({ input, secret: process.env.PROCESS_SENTINEL, argument: process.argv[1] })));",
      'literal; process.exit(99)',
    ],
    stdin: 'compose-stdin',
    environment: { PROCESS_SENTINEL: 'execution-only' },
  });

  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    input: 'compose-stdin',
    secret: 'execution-only',
    argument: 'literal; process.exit(99)',
  });
  expect(result.stderr).toBe('');
});
