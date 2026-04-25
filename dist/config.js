import path from 'path';
import os from 'os';
const CONFIG = {
    BROWSER_PATH: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    PROFILE_DIR: "C:\\temp\\prism_profile",
    PORT: 9223,
    URLS: {
        site: "https://label-prism.vercel.app/tasks",
        chat: "https://gemini.google.com/app"
    },
    TEMP_IMAGE_PATH: path.resolve(os.tmpdir(), "prism_temp_image.png"),
    PROMPT: ` Analyze the provided Input and Output images to identify visual differences. Your goal is to generate instructions for an AI to learn visual reasoning—specifically what changed and why.

### Hierarchy of Importance (Priority Rule):
When multiple changes exist, prioritize them in this order: Subject >> Object >> Background >> Style. Focus on major visible changes and ignore minute or insignificant details.

### Analysis Categories:
1. Subject: Pose, expression, gaze, or direction (e.g., "Face turned, smiling").
2. Environment: Background, lighting, or weather (e.g., "Day -> sunset").
3. Objects/Attributes: Clothes, props, or additions/removals (e.g., "Add mug").
4. Style: Color tone, lighting, or mood (e.g., "Bright cinematic").

### Tool Selection Logic:
Select the tool that best fits the transformation type:
- Arrow: Use for movement or direction changes.
- Box: Use for large objects or encompassing areas.
- Point: Use for small details or specific coordinate changes (e.g., eye color).
- Draw: Use for freehand marking, especially when an object is missing in the output.

### Instruction Requirements:
- Start every instruction with an action verb: Add, Remove, Change, Replace, or Apply.
- Be specific and avoid vague language (e.g., use "Change subject to face forward and smile" instead of "Make face better").
- Grouping Rule: If the same change is repeated (e.g., removing five trees), group the annotations and write one shared sentence (e.g., "Remove all the trees"). Only group similar changes.

### Skip Criteria:
Flag the task as "skipped" if:
- Images contain NSFW content (nudity, violence, etc.).
- Input and Output images are identical.
- Input and Output images are completely unrelated.

OUTPUT CONSTRAINTS (STRICT):
Output ONLY a Markdown table of 4 rows. Do NOT output JSON. Do NOT include introductory or concluding text. 
Use this exact format:

| Category | Tool to Use | Reason | Transformation Instruction |
|---|---|---|---|
| [Category] | [Tool] | [Brief reasoning] | [Start with verb: Add/Remove/Change/Replace] |`
};
export default CONFIG;
