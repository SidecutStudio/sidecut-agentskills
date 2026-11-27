import countNotesWords from '../data/eval-fixtures/count-notes-words.json' with { type: 'json' };
import otherPluginStatus from '../data/eval-fixtures/other-plugin-status.json' with {
  type: 'json',
};
import pluginStatus from '../data/eval-fixtures/plugin-status.json' with { type: 'json' };
import summarizeNotes from '../data/eval-fixtures/summarize-notes.json' with { type: 'json' };
import { escapeRegExp } from './settings.ts';

type EvalFiles = Map<string, string>;
type Fixture = {
  input: { prompt: string; files?: Record<string, string> };
  grading: { kind: string }[];
};

function shellString(text: string): string {
  return "'" + text.replaceAll("'", "'\\''") + "'";
}

/** Adapt just the routing check. The portable rubric stays with the fixture. */
function triggerCase(name: string, fixture: Fixture, operand: string): EvalFiles {
  const routing = fixture.grading.find(
    ({ kind }) => kind === 'skill-used' || kind === 'skill-quiet',
  );
  if (!routing) throw new Error(`Fixture for ${name} has no routing check.`);
  const positive = routing.kind === 'skill-used';
  // Match the entire JSON skill value, including the closing quote for routers.
  const match = `"skill"\\s*:\\s*"${escapeRegExp(operand)}"`;
  const files: EvalFiles = new Map([
    [
      'prompt.md',
      `---\ntags: [${positive ? 'trigger' : 'negative'}]\nruns: 1\nmax_turns: 6\nallowed_tools: [Read, Glob, Grep, Skill]\n---\n${fixture.input.prompt}\n`,
    ],
    [
      `graders/${positive ? 'skill-fired' : 'no-skill'}.md`,
      `---\ntype: tool_used\ntool: Skill\ninput_match: '${match}'\n${positive ? 'min: 1\narm: with-only' : 'min: 0\nmax: 0\narm: both'}\n---\n`,
    ],
  ]);
  if (fixture.input.files) {
    files.set(
      'case.yaml',
      `schema_version: "1.0"\nname: ${name}\ncontext:\n  scaffold_script: ./setup.sh\n`,
    );
    files.set(
      'setup.sh',
      Object.entries(fixture.input.files)
        .map(([file, contents]) => `printf '%s' ${shellString(contents)} > ${shellString(file)}\n`)
        .join(''),
    );
  }
  return files;
}

export function pluginStarterEvals(id: string, key: string, displayName: string) {
  const skill = `${key}-check-status`;
  const operand = `${id}:${skill}`;
  const alternatePrompt = /calendar/i.test(displayName)
    ? otherPluginStatus.input.prompt.replace(
        'calendar plugin’s scheduling',
        'mail plugin’s messaging',
      )
    : otherPluginStatus.input.prompt;
  return new Map([
    [
      `${skill}-trigger`,
      triggerCase(
        `${skill}-trigger`,
        {
          ...pluginStatus,
          input: { prompt: pluginStatus.input.prompt.replace('the export plugin', displayName) },
        },
        operand,
      ),
    ],
    [
      'negative-unrelated',
      triggerCase(
        'negative-unrelated',
        { ...otherPluginStatus, input: { prompt: alternatePrompt } },
        operand,
      ),
    ],
  ]);
}

/** The notes fixtures use a real notes skill. Other skills get a first prompt based on what they do. */
export function skillStarterEvals(id: string, key: string, skill: string, action: string) {
  const operand = `${id}:${skill}`;
  const name = `${skill}-trigger`;
  if (skill === `${key}-summarize-notes`) {
    const negative = `negative-${skill}-count-notes-words`;
    return new Map([
      [name, triggerCase(name, summarizeNotes, operand)],
      [negative, triggerCase(negative, countNotesWords, operand)],
    ]);
  }
  return new Map([
    [
      name,
      triggerCase(
        name,
        {
          input: { prompt: `Can you ${action.replace(/\.$/, '')}?` },
          grading: summarizeNotes.grading,
        },
        operand,
      ),
    ],
  ]);
}
